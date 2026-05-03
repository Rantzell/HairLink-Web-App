import { z } from 'zod';

// ── Auth ──
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  device_name: z.string().optional(),
  onesignal_id: z.string().optional(),
});

export const registerSchema = z.object({
  userType: z.enum(['donor', 'recipient']).optional(),
  role: z.enum(['donor', 'recipient']).optional(),
  first_name: z.string().min(1).max(255),
  last_name: z.string().min(1).max(255),
  email: z.string().email().max(255),
  password: z.string().min(8),
  password_confirmation: z.string().min(8).optional(),
  country: z.string().max(255).optional(),
  region: z.string().max(255).optional(),
  postal_code: z.string().max(255).optional(),
  age: z.coerce.number().int().min(1).max(120).optional(),
  gender: z.string().max(255).optional(),
  phone: z.string().max(13).optional(),
  device_name: z.string().optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  password_confirmation: z.string().min(8),
});

// ── Donations ──
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

// ── Hair Requests ──
export const requestCreateSchema = z.object({
  reference: z.string().min(1),
  contact_number: z.string().optional(),
  gender: z.string().optional(),
  story: z.string().optional(),
  appointment_at: z.string().optional(),
  notes: z.string().optional(),
  wig_length: z.string().optional(),
  wig_color: z.string().optional(),
});

export const requestStatusSchema = z.object({
  status: z.string().min(1),
});

// ── Community ──
export const postCreateSchema = z.object({
  content: z.string().min(1),
});

export const commentCreateSchema = z.object({
  content: z.string().optional(),
  parent_id: z.string().uuid().optional(),
});

// ── Staff ──
export const verificationStatusSchema = z.object({
  status: z.string().min(1),
  remarks: z.string().min(1),
});

export const assignWigmakerSchema = z.object({
  wigmaker_id: z.coerce.number().int().positive(),
});

export const trackingStatusSchema = z.object({
  status: z.string().min(1),
  notes: z.string().optional(),
  delivery_tracking_link: z.string().url().max(2048).optional(),
});

export const matchWigSchema = z.object({
  request_reference: z.string().min(1),
  wig_id: z.coerce.number().int().positive(),
});

// ── Wigmaker ──
export const taskUpdateSchema = z.object({
  status: z.enum(['assigned', 'processing', 'completed']),
  progressNotes: z.string().min(1),
  updatedAt: z.string().optional(),
  deliveryLink: z.string().url().max(2048).optional(),
});

// ── Profile ──
export const profileUpdateSchema = z.object({
  first_name: z.string().min(1).max(255),
  last_name: z.string().min(1).max(255),
  phone: z.string().max(20).optional(),
  bio: z.string().max(1000).optional(),
  age: z.coerce.number().int().min(1).max(120).optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
});

// ── Monetary Donations ──
export const monetaryDonationSchema = z.object({
  amount: z.coerce.number().min(10),
  name: z.string().max(255).optional(),
  email: z.string().email().max(255).optional(),
  payment_method: z.string().min(1),
  currency: z.string().default('PHP'),
});

// ── Referrals ──
export const referralCodeSchema = z.object({
  referral_code: z.string().min(1).max(20),
});

// ── Partnerships ──
export const partnershipSchema = z.object({
  full_name: z.string().min(1).max(255),
  email: z.string().email(),
  phone: z.string().optional(),
  organization: z.string().optional(),
  message: z.string().min(1),
});

// ── Events ──
export const eventCreateSchema = z.object({
  event_title: z.string().min(1).max(255),
  event_date: z.string().min(1),
  event_description: z.string().optional(),
  event_location: z.string().max(255).optional(),
});
