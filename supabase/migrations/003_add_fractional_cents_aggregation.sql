-- Add pending_fractional_cents column to users_profile table
-- This column stores fractional cents that haven't reached 1 cent yet
-- When accumulated >= 1, they get deducted from balance

ALTER TABLE public.users_profile
ADD COLUMN pending_fractional_cents NUMERIC(5, 2) DEFAULT 0.0;

-- Update the column constraint to ensure it's non-negative
ALTER TABLE public.users_profile
ADD CONSTRAINT pending_fractional_non_negative CHECK (pending_fractional_cents >= 0);
