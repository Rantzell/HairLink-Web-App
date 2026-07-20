import { Router } from 'express';
import prisma from '../config/database';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { monetaryDonationSchema } from '../schemas';
import {
  notifyMonetaryReceived,
  notifyStaffNewMonetary,
} from '../services/notification.service';
import { generateSequentialReference } from '../services/reference.service';
import { createInvoice, verifyWebhookToken } from '../services/xendit.service';

const router = Router();

function getFrontendUrl(): string {
  // First CORS origin is the web frontend; fall back to localhost dev.
  const origin = (process.env.CORS_ORIGIN || '').split(',')[0].trim();
  return origin || 'http://localhost:5173';
}

// POST /internal-api/monetary/create-invoice
// Creates a Pending donation record and a Xendit hosted invoice, then returns
// the invoice URL for the frontend to redirect to. The donation is only marked
// paid later, by the Xendit webhook.
router.post('/create-invoice', authenticate, validate(monetaryDonationSchema), async (req, res) => {
  try {
    const userId = req.user!.id;
    const validatedData = req.body;
    const reference = await generateSequentialReference('MD');

    const finalName =
      validatedData.name ||
      (req.user?.firstName ? `${req.user.firstName} ${req.user.lastName}`.trim() : req.user?.name);
    const finalEmail = validatedData.email || req.user?.email;
    const amount = Number(validatedData.amount);

    const donation = await prisma.monetaryDonation.create({
      data: {
        userId,
        name: finalName || null,
        email: finalEmail || null,
        amount,
        currency: validatedData.currency || 'PHP',
        paymentMethod: 'Xendit',
        referenceNumber: reference,
        status: 'Pending',
        anonymous: validatedData.is_anonymous || false,
        remarks: validatedData.purpose || null,
      },
    });

    const frontend = getFrontendUrl();
    const invoice = await createInvoice({
      externalId: reference,
      amount,
      payerEmail: finalEmail,
      description: `HairLink donation ${reference}${validatedData.purpose ? ` — ${validatedData.purpose}` : ''}`,
      currency: validatedData.currency || 'PHP',
      successRedirectUrl: `${frontend}/donor/monetary?status=success&ref=${encodeURIComponent(reference)}`,
      failureRedirectUrl: `${frontend}/donor/monetary?status=failed&ref=${encodeURIComponent(reference)}`,
    });

    await prisma.monetaryDonation.update({
      where: { id: donation.id },
      data: { xenditInvoiceId: invoice.id },
    });

    console.log(`[Monetary] Invoice ${invoice.id} created for ${reference} (₱${amount})`);
    res.json({ success: true, reference, invoiceUrl: invoice.invoice_url });
  } catch (err: any) {
    console.error('[Monetary] create-invoice error:', err?.response?.data || err);
    res.status(500).json({ error: 'Failed to start payment' });
  }
});

// POST /api/public/monetary/webhook  (mounted publicly, unauthenticated)
// Xendit invoice callback. We verify the shared token, then flip the matching
// donation to a terminal status and fire notifications.
export async function handleXenditWebhook(req: any, res: any) {
  try {
    if (!verifyWebhookToken(req.header('x-callback-token'))) {
      console.warn('[Monetary] Webhook rejected: bad callback token');
      return res.status(401).json({ error: 'Invalid callback token' });
    }

    const { id: invoiceId, external_id: externalId, status } = req.body || {};
    const donation = await prisma.monetaryDonation.findFirst({
      where: {
        OR: [
          invoiceId ? { xenditInvoiceId: invoiceId } : undefined,
          externalId ? { referenceNumber: externalId } : undefined,
        ].filter(Boolean) as any,
      },
    });

    if (!donation) {
      console.warn(`[Monetary] Webhook: no donation for invoice ${invoiceId} / ${externalId}`);
      // 200 so Xendit does not keep retrying a record we cannot match.
      return res.json({ received: true });
    }

    // Idempotency: ignore repeats once already settled.
    if (donation.status === 'Completed') {
      return res.json({ received: true });
    }

    if (status === 'PAID' || status === 'SETTLED') {
      await prisma.monetaryDonation.update({
        where: { id: donation.id },
        data: { status: 'Completed' },
      });
      const amount = Number(donation.amount || 0);
      if (donation.userId) {
        await notifyMonetaryReceived(donation.userId, amount, donation.referenceNumber || '');
      }
      await notifyStaffNewMonetary(donation.name || 'A donor', donation.referenceNumber || '', amount);
      console.log(`[Monetary] Donation ${donation.referenceNumber} marked Completed`);
    } else if (status === 'EXPIRED' || status === 'FAILED') {
      await prisma.monetaryDonation.update({
        where: { id: donation.id },
        data: { status: status === 'EXPIRED' ? 'Expired' : 'Failed' },
      });
      console.log(`[Monetary] Donation ${donation.referenceNumber} marked ${status}`);
    }

    res.json({ received: true });
  } catch (err) {
    console.error('[Monetary] Webhook error:', err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}

// GET /api/monetary
// List the caller's monetary donations, newest first.
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user!.id;
    const rows = await prisma.monetaryDonation.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(
      rows.map((r) => ({
        id: `monetary-${r.id}`,
        reference: r.referenceNumber,
        amount: Number(r.amount),
        currency: r.currency,
        paymentMethod: r.paymentMethod,
        status: r.status,
        anonymous: r.anonymous,
        proofPath: r.proofPath,
        createdAt: r.createdAt ? r.createdAt.toISOString() : null,
      })),
    );
  } catch (err) {
    console.error('[Monetary] List error:', err);
    res.status(500).json({ error: 'Failed to fetch monetary donations' });
  }
});

export default router;
