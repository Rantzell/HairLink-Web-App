import { Router } from 'express';
import prisma from '../config/database';
import { validate } from '../middleware/validate';
import { partnershipSchema } from '../schemas';

const router = Router();

// POST /internal-api/partnerships
router.post('/', validate(partnershipSchema), async (req, res) => {
  try {
    await prisma.partnership.create({
      data: {
        fullName: req.body.full_name,
        email: req.body.email,
        phone: req.body.phone || null,
        organization: req.body.organization || null,
        message: req.body.message,
        status: 'pending',
      },
    });
    res.json({ success: true, message: 'Partnership inquiry submitted!' });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

export default router;
