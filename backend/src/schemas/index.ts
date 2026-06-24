import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  device_name: z.string().optional(),
  onesignal_id: z.string().optional(),
});

export const registerSchema = z.object({
  userType: z.enum(['donor', 'recipient']).optional(),
  role: z.enum(['donor', 'recipient']).optional(),
  first_name: z.string().min(1).max(50).regex(/^[A-Za-z\s'-]+$/, 'First name may only contain letters, spaces, hyphens, and apostrophes.'),
  last_name: z.string().min(1).max(50).regex(/^[A-Za-z\s'-]+$/, 'Last name may only contain letters, spaces, hyphens, and apostrophes.'),
  email: z.string().email().max(255),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[!@#$%^&*(),.?":{}|<>_]/, 'Password must contain at least one symbol'),
  password_confirmation: z.string().optional(),
  country: z.string().max(255).optional(),
  region: z.string().max(255).optional(),
  postal_code: z.string().max(255).optional(),
  age: z.coerce.number().int().min(1).max(120).optional().nullable(),
  gender: z.enum(['male', 'female', 'nonbinary', 'prefer_not_say']).optional().nullable(),
  phone: z.string()
    .regex(/^\+639\d{9}$/, 'Mobile number must be exactly 10 digits starting with 9 after +63.')
    .or(z.literal(''))
    .optional()
    .nullable(),
  device_name: z.string().optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  email: z.string().email(),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[!@#$%^&*(),.?":{}|<>_]/, 'Password must contain at least one symbol'),
  password_confirmation: z.string(),
});

export const donationCreateSchema = z.object({
  reference: z.string().min(1),
  hair_length: z.string().min(1),
  hair_color: z.string().min(1),
  treated_hair: z.coerce.boolean().optional(),
  address: z.string().optional(),
  reason: z.string().optional(),
  dropoff_location: z.string().optional(),
  appointment_at: z.string().optional(),
});

export const donationStatusSchema = z.object({
  status: z.string().min(1),
  remarks: z.string().optional(),
});

export const deliveryLinkSchema = z.object({
  donor_delivery_link: z.string().min(1),
});

export const scheduleDeliverySchema = z.object({
  scheduled_delivery_at: z.string().min(1),
});

export const requestCreateSchema = z.object({
  reference: z.string().min(1),
  contact_number: z.string().optional(),
  gender: z.string().optional(),
  story: z.string().optional(),
  appointment_at: z.string().optional(),
  notes: z.string().optional(),
  wig_length: z.string().optional(),
  wig_color: z.string().optional(),
  delivery_method: z.enum(['delivery', 'pickup']).default('delivery'),
});

export const requestStatusSchema = z.object({
  status: z.string().min(1),
});

export const postCreateSchema = z.object({
  content: z.string().min(1),
});

export const commentCreateSchema = z.object({
  content: z.string().optional(),
  parent_id: z.string().uuid().optional(),
});

export const verificationStatusSchema = z.object({
  status: z.string().min(1),
  remarks: z.string().min(1),
});

export const assignWigmakerSchema = z.object({
  wigmaker_id: z.string().uuid(),
  donation_references: z.array(z.string()).min(1, 'At least 1 donation is required to start production.'),
  material_delivery_link: z.string().url('Material delivery link must be a valid URL.').max(2048),
  staff_note: z.string().max(500).optional().nullable(),
});

export const trackingStatusSchema = z.object({
  status: z.string().min(1),
  notes: z.string().optional(),
  delivery_tracking_link: z.string().url().max(2048).or(z.literal('')).transform(val => val === '' ? undefined : val).optional().nullable(),
});

export const matchWigSchema = z.object({
  request_reference: z.string().min(1),
  wig_id: z.coerce.number().int(),
});

export const provideMaterialDeliveryLinkSchema = z.object({
  material_delivery_link: z.string().url('Must be a valid URL').max(2048),
});

export const taskUpdateSchema = z.object({
  status: z.enum(['assigned', 'processing', 'completed', 'shipped', 'received']),
  progressNotes: z.string().or(z.literal('')).optional().nullable(),
  updatedAt: z.string().optional(),
  deliveryLink: z.string().url().max(2048).or(z.literal('')).transform(val => val === '' ? undefined : val).optional().nullable(),
  wigLength: z.enum(['short', 'long']).optional(),
  wigColor: z.enum(['black', 'brown', 'light']).optional(),
});

export const materialConfirmationSchema = z.object({
  notes: z.string().optional(),
});

export const profileUpdateSchema = z.object({
  first_name: z.string().min(1).max(50).regex(/^[A-Za-z\s'-]+$/, 'First name may only contain letters, spaces, hyphens, and apostrophes.'),
  last_name: z.string().min(1).max(50).regex(/^[A-Za-z\s'-]+$/, 'Last name may only contain letters, spaces, hyphens, and apostrophes.'),
  phone: z.string()
    .regex(/^\+639\d{9}$/, 'Mobile number must be exactly 10 digits starting with 9 after +63.')
    .or(z.literal(''))
    .optional()
    .nullable(),
  bio: z.string().max(1000).optional().nullable(),
  age: z.coerce.number().int().min(1).max(120).optional().nullable(),
  gender: z.enum(['male', 'female', 'nonbinary', 'prefer_not_say']).optional().nullable(),
});

export const monetaryDonationSchema = z.object({
  amount: z.coerce.number().min(10),
  name: z.string().max(255).optional(),
  email: z.string().email().max(255).optional(),
  payment_method: z.string().min(1),
  currency: z.string().default('PHP'),
  is_anonymous: z.string().optional().transform(v => v === '1'),
});

export const referralCodeSchema = z.object({
  referral_code: z.string().min(1).max(20),
});

export const partnershipSchema = z.object({
  full_name: z.string().min(1).max(255),
  email: z.string().email(),
  phone: z.string().optional(),
  organization: z.string().optional(),
  message: z.string().min(1),
});

export const eventCreateSchema = z.object({
  event_title: z.string().min(1).max(255),
  event_date: z.string().min(1),
  event_description: z.string().optional(),
  event_location: z.string().max(255).optional(),
});
