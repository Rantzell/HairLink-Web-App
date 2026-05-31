-- Migration: Add delivery_method to hair_requests
ALTER TABLE hair_requests ADD COLUMN IF NOT EXISTS delivery_method VARCHAR(50) DEFAULT 'delivery';
