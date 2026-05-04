import { Router } from 'express';
import multer from 'multer';
import prisma from '../config/database';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { profileUpdateSchema } from '../schemas';
import { uploadFile, deleteFile } from '../services/storage.service';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

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

    const updateData: any = {
      firstName: req.body.first_name,
      lastName: req.body.last_name,
      phone: req.body.phone || null,
      bio: req.body.bio || null,
      age: req.body.age || null,
      gender: req.body.gender || null,
    };

    if (req.file) {
      if (user.profile_photo_url) {
        await deleteFile('hairlink', `profile-photos/${user.profile_photo_url}`);
      }
      const path = await uploadFile(req.file, 'hairlink', 'profile-photos');
      updateData.profile_photo_url = path.split('/').pop();
    }

    const updated = await prisma.user.update({ where: { id: user.id }, data: updateData });
    res.json({ success: true, message: 'Profile updated successfully!', user: s(updated) });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

export default router;
