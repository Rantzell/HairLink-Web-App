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
        name: req.body.full_name,
        email: req.body.email,
        contact: req.body.phone || null,
        description: req.body.message,
        type: req.body.organization || 'Organization',
        status: 'Pending',
      },
    });
    res.json({ success: true, message: 'Partnership inquiry submitted!' });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

export default router;
