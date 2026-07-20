-- Xendit integration: store the Xendit invoice id on each monetary donation.
-- Apply on Supabase (SQL editor) before deploying the backend.
ALTER TABLE monetary_donations
  ADD COLUMN IF NOT EXISTS xendit_invoice_id text;

ALTER TABLE monetary_donations
  ADD CONSTRAINT monetary_donations_xendit_invoice_id_key UNIQUE (xendit_invoice_id);
