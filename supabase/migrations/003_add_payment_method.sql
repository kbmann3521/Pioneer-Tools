-- Add default payment method ID column for auto-recharge
-- This stores the Stripe Payment Method ID (not card data)

ALTER TABLE public.users_profile
ADD COLUMN IF NOT EXISTS default_payment_method_id TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_profile_payment_method 
ON public.users_profile(default_payment_method_id);

-- Add column to track last auto-recharge attempt (for debugging/auditing)
ALTER TABLE public.users_profile
ADD COLUMN IF NOT EXISTS last_auto_recharge_attempt TIMESTAMP WITH TIME ZONE;

-- Add column to track failed auto-recharge attempts
ALTER TABLE public.users_profile
ADD COLUMN IF NOT EXISTS failed_auto_recharge_count INTEGER DEFAULT 0;
