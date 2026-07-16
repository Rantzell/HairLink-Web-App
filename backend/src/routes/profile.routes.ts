import { Router } from 'express';
import multer from 'multer';
import prisma from '../config/database';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { profileUpdateSchema } from '../schemas';
import { uploadFile, deleteFile } from '../services/storage.service';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

function s(o: any): any {
  if (o === null || o === undefined) return o;
  if (typeof o === 'bigint') return o.toString();
  if (typeof o === 'object' && o.d && typeof o.toFixed === 'function') return o.toString();
  if (o instanceof Date) return o;
  if (Array.isArray(o)) return o.map(s);
  if (typeof o === 'object') {
    const r: any = {};
    for (const k of Object.keys(o)) { r[k] = s(o[k]); }
    return r;
  }
  return o;
}

// GET /internal-api/profile
router.get('/', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) { res.status(404).json({ error: 'Not found' }); return; }
    res.json(s(user));
  } catch (err: any) { 
    console.error('Profile Fetch Error:', err);
    res.status(500).json({ error: 'Failed', message: err.message }); 
  }
});

// POST /internal-api/profile
router.post('/', authenticate, upload.single('profile_photo'), validate(profileUpdateSchema), async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) { res.status(404).json({ error: 'Not found' }); return; }

    // Only update the fields the client actually sent. Anything omitted is left
    // untouched — so a photo-only upload doesn't wipe bio/age/gender/phone.
    const nameLocked = user.role === 'donor' || user.role === 'recipient';
    const updateData: any = {};

    // Donors and recipients cannot change their own name — ignore any submitted values.
    if (!nameLocked) {
      if (req.body.first_name !== undefined) updateData.firstName = req.body.first_name;
      if (req.body.last_name !== undefined) updateData.lastName = req.body.last_name;
    }
    if (req.body.phone !== undefined) updateData.phone = req.body.phone || null;
    if (req.body.bio !== undefined) updateData.bio = req.body.bio || null;
    if (req.body.age !== undefined) updateData.age = req.body.age ?? null;
    if (req.body.gender !== undefined) updateData.gender = req.body.gender || null;

    if (req.file) {
      if (user.profile_photo_url) {
        await deleteFile('hairlink', `profile-photos/${user.profile_photo_url}`);
      }
      const path = await uploadFile(req.file, 'hairlink', 'profile-photos');
      updateData.profile_photo_url = path.split('/').pop();
    }

    const updated = await prisma.user.update({ where: { id: user.id }, data: updateData });
    res.json({ success: true, message: 'Profile updated successfully!', user: s(updated) });
  } catch (err: any) {
    console.error('Profile Update Error:', err);
    res.status(err?.status || 500).json({ error: 'Failed', message: err?.message || 'Profile update failed' });
  }
});

export default router;
