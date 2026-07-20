import axios from 'axios';

// Xendit hosted-invoice integration.
//
// Auth: HTTP Basic with the secret key as the username and an empty password.
// Docs: https://developers.xendit.co/api-reference/#create-invoice
//
// Required env vars (add to the root .env — never commit real keys):
//   XENDIT_SECRET_KEY    — secret API key (starts with `xnd_...`)
//   XENDIT_WEBHOOK_TOKEN — the "Verification / callback token" from the
//                          Xendit dashboard, sent back on every webhook as the
//                          `x-callback-token` header.

const XENDIT_API_BASE = 'https://api.xendit.co';

export interface CreateInvoiceParams {
  externalId: string; // our reference number — echoed back on the webhook
  amount: number;
  payerEmail?: string | null;
  description: string;
  successRedirectUrl: string;
  failureRedirectUrl: string;
  currency?: string;
}

export interface XenditInvoice {
  id: string;
  invoice_url: string;
  status: string;
  external_id: string;
  amount: number;
}

function getSecretKey(): string {
  const key = process.env.XENDIT_SECRET_KEY;
  if (!key) {
    throw new Error('XENDIT_SECRET_KEY is not configured');
  }
  return key;
}

export async function createInvoice(params: CreateInvoiceParams): Promise<XenditInvoice> {
  const res = await axios.post(
    `${XENDIT_API_BASE}/v2/invoices`,
    {
      external_id: params.externalId,
      amount: params.amount,
      payer_email: params.payerEmail || undefined,
      description: params.description,
      currency: params.currency || 'PHP',
      success_redirect_url: params.successRedirectUrl,
      failure_redirect_url: params.failureRedirectUrl,
    },
    {
      auth: { username: getSecretKey(), password: '' },
      headers: { 'Content-Type': 'application/json' },
    },
  );
  return res.data as XenditInvoice;
}

// Constant-time-ish comparison of the incoming webhook token against the
// configured verification token.
export function verifyWebhookToken(incomingToken: string | undefined): boolean {
  const expected = process.env.XENDIT_WEBHOOK_TOKEN;
  if (!expected || !incomingToken) return false;
  return incomingToken === expected;
}
