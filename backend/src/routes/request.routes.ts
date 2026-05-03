import { Router, Request, Response } from 'express';
import multer from 'multer';
import prisma from '../config/database';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { requestCreateSchema, requestStatusSchema } from '../schemas';
import { createStatusHistory, getStatusHistories } from '../services/statusHistory.service';
import { uploadFile } from '../services/storage.service';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const REQUEST_TYPE = 'App\\Models\\HairRequest';

function serializeRequest(r: any) {
  return { ...r, id: r.id.toString(), userId: r.userId?.toString() || null, user: r.user ? { ...r.user, id: r.user.id.toString() } : undefined };
}

// GET /internal-api/requests
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const requests = await prisma.hairRequest.findMany({
      where: { userId: req.user!.id },
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });
    const result = await Promise.all(requests.map(async (r) => {
      const statusHistories = await getStatusHistories(REQUEST_TYPE, r.id);
      return { ...serializeRequest(r), statusHistories };
    }));
    res.json(result);
  } catch (err) { res.status(500).json({ error: 'Failed to fetch requests' }); }
});

// POST /internal-api/requests
router.post('/', authenticate, upload.fields([
  { name: 'medical_certificate', maxCount: 1 },
  { name: 'diagnosis_photo', maxCount: 1 },
  { name: 'recipient_photo', maxCount: 1 },
  { name: 'additional_photo', maxCount: 1 },
  { name: 'documents', maxCount: 10 },
]), validate(requestCreateSchema), async (req: Request, res: Response) => {
  try {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

    let medCert: string | null = null;
    let diagPhoto: string | null = null;
    let recipientPhoto: string | null = null;
    let additionalPhoto: string | null = null;
    let documents: string[] = [];

    if (files?.medical_certificate?.[0]) medCert = await uploadFile(files.medical_certificate[0], 'hairlink', 'requests/verification', 'document');
    if (files?.diagnosis_photo?.[0]) diagPhoto = await uploadFile(files.diagnosis_photo[0], 'hairlink', 'requests/verification');
    if (files?.recipient_photo?.[0]) recipientPhoto = await uploadFile(files.recipient_photo[0], 'hairlink', 'requests/verification');
    if (files?.additional_photo?.[0]) additionalPhoto = await uploadFile(files.additional_photo[0], 'hairlink', 'requests/photos');
    if (files?.documents) {
      for (const f of files.documents) {
        documents.push(await uploadFile(f, 'hairlink', 'requests/documents', 'document'));
      }
    }

    const hairRequest = await prisma.hairRequest.create({
      data: {
        userId: req.user!.id,
        reference: req.body.reference,
        contactNumber: req.body.contact_number || null,
        gender: req.body.gender || null,
        story: req.body.story || null,
        medicalCertificate: medCert,
        diagnosisPhoto: diagPhoto,
        recipientPhoto: recipientPhoto,
        additionalPhoto: additionalPhoto,
        documents: documents.length ? documents : undefined,
        status: 'Submitted',
        appointmentAt: req.body.appointment_at ? new Date(req.body.appointment_at) : null,
        notes: req.body.notes || null,
        wigLength: req.body.wig_length || null,
        wigColor: req.body.wig_color || null,
      },
    });

    await createStatusHistory(REQUEST_TYPE, hairRequest.id, 'Submitted');
    res.status(201).json(serializeRequest(hairRequest));
  } catch (err) {
    console.error('[HairRequest] Create error:', err);
    res.status(500).json({ error: 'Failed to create request' });
  }
});

// GET /internal-api/requests/:reference
router.get('/:reference', authenticate, async (req: Request, res: Response) => {
  try {
    const hairRequest = await prisma.hairRequest.findFirst({
      where: { reference: req.params.reference, userId: req.user!.id },
      include: { user: true },
    });
    if (!hairRequest) { res.status(404).json({ message: 'Request not found' }); return; }
    const statusHistories = await getStatusHistories(REQUEST_TYPE, hairRequest.id);
    res.json({ ...serializeRequest(hairRequest), statusHistories });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch request' }); }
});

// POST /internal-api/requests/:reference/status
router.post('/:reference/status', authenticate, validate(requestStatusSchema), async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const where: any = { reference: req.params.reference };
    if (!['staff', 'admin'].includes(user.role)) where.userId = user.id;

    const hairRequest = await prisma.hairRequest.findFirst({ where });
    if (!hairRequest) { res.status(404).json({ message: 'Request not found' }); return; }

    const newStatus = req.body.status;
    if (hairRequest.status !== newStatus) {
      await prisma.hairRequest.update({ where: { id: hairRequest.id }, data: { status: newStatus } });
      await createStatusHistory(REQUEST_TYPE, hairRequest.id, newStatus);
    }

    const updated = await prisma.hairRequest.findUnique({ where: { id: hairRequest.id }, include: { user: true } });
    const statusHistories = await getStatusHistories(REQUEST_TYPE, hairRequest.id);
    res.json({ ...serializeRequest(updated), statusHistories });
  } catch (err) { res.status(500).json({ error: 'Failed to update status' }); }
});

// POST /internal-api/requests/:reference/confirm-received (recipient confirms wig)
router.post('/:reference/confirm-received', authenticate, async (req: Request, res: Response) => {
  try {
    const hairRequest = await prisma.hairRequest.findFirst({
      where: { reference: req.params.reference, userId: req.user!.id },
    });
    if (!hairRequest) { res.status(404).json({ message: 'Request not found' }); return; }

    if (hairRequest.status !== 'In Transit') {
      res.status(422).json({ message: 'Wig can only be confirmed when status is In Transit.', success: false });
      return;
    }

    const now = new Date();
    await prisma.hairRequest.update({
      where: { id: hairRequest.id },
      data: { status: 'Completed', wigReceivedAt: now },
    });
    await createStatusHistory(REQUEST_TYPE, hairRequest.id, 'Completed', 'Recipient confirmed wig received');

    res.json({
      message: 'Wig received confirmed! Your request is now complete.',
      success: true,
      wig_received_at: now.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) + ' ' + now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    });
  } catch (err) { res.status(500).json({ error: 'Failed to confirm' }); }
});

// GET /internal-api/requests/stats
router.get('/stats', authenticate, async (req: Request, res: Response) => {
  try {
    const activeCount = await prisma.hairRequest.count({
      where: {
        userId: req.user!.id,
        status: { notIn: ['Completed', 'Rejected'] }
      }
    });
    res.json({ activeCount });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch request stats' });
  }
});

export default router;
