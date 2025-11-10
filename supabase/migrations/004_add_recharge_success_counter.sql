-- Add successful and failed auto-recharge counters to track recharge history
-- Run this after migrations 001, 002, and 003

ALTER TABLE public.users_profile
ADD COLUMN IF NOT EXISTS successful_auto_recharges_count INTEGER DEFAULT 0;

ALTER TABLE public.users_profile
ADD COLUMN IF NOT EXISTS failed_auto_recharge_count INTEGER DEFAULT 0;

ALTER TABLE public.users_profile
ADD COLUMN IF NOT EXISTS last_auto_recharge_attempt TIMESTAMP WITH TIME ZONE;

-- Add index for tracking recharge history
CREATE INDEX IF NOT EXISTS idx_users_profile_auto_recharge_stats 
ON public.users_profile(successful_auto_recharges_count, failed_auto_recharge_count);
