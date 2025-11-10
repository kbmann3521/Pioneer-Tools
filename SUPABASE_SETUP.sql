-- ============================================================================
-- TOOLS HUB - COMPLETE SUPABASE SETUP SQL
-- Credit-Based Billing System with API Keys and Rate Limiting
-- ============================================================================
-- Copy and paste this ENTIRE script into Supabase SQL Editor and click RUN

-- Create users_profile table with credit-based billing
CREATE TABLE IF NOT EXISTS public.users_profile (
  id UUID PRIMARY KEY,
  
  -- Credit balance in cents (e.g., 1000 = $10.00)
  balance INTEGER NOT NULL DEFAULT 0,
  
  -- Auto-recharge settings
  auto_recharge_enabled BOOLEAN DEFAULT false,
  auto_recharge_threshold INTEGER, -- in cents (e.g., 500 = $5.00)
  auto_recharge_amount INTEGER, -- in cents (e.g., 2000 = $20.00)
  
  -- Monthly budget limit in cents (null = no limit)
  monthly_spending_limit INTEGER,
  
  -- Stripe customer ID for payments
  stripe_customer_id TEXT,
  
  -- Usage tracking
  usage_this_month INTEGER DEFAULT 0, -- in cents
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  
  CONSTRAINT fk_auth_user FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT balance_non_negative CHECK (balance >= 0),
  CONSTRAINT threshold_less_than_recharge CHECK (
    auto_recharge_threshold IS NULL OR 
    auto_recharge_amount IS NULL OR 
    auto_recharge_threshold < auto_recharge_amount
  )
);

-- Create api_keys table for API authentication
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  last_used TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  
  CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES public.users_profile(id) ON DELETE CASCADE
);

-- Create billing_transactions table for audit trail
CREATE TABLE IF NOT EXISTS public.billing_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  
  -- Type: 'charge' (API usage), 'deposit' (user funded), 'auto_recharge', 'refund'
  type TEXT NOT NULL CHECK (type IN ('charge', 'deposit', 'auto_recharge', 'refund')),
  
  -- Amount in cents (negative for charges, positive for deposits)
  amount INTEGER NOT NULL,
  
  -- Optional: which tool was used
  tool_name TEXT,
  
  -- Optional: Stripe payment intent ID
  stripe_intent_id TEXT,
  
  -- Description of transaction
  description TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  
  CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES public.users_profile(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON public.api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key ON public.api_keys(key);
CREATE INDEX IF NOT EXISTS idx_billing_transactions_user_id ON public.billing_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_transactions_created_at ON public.billing_transactions(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE public.users_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_transactions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Users can view their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON public.users_profile;
CREATE POLICY "Users can view own profile"
  ON public.users_profile FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.users_profile;
CREATE POLICY "Users can update own profile"
  ON public.users_profile FOR UPDATE
  USING (auth.uid() = id);

-- Users can view their own API keys
DROP POLICY IF EXISTS "Users can view own api keys" ON public.api_keys;
CREATE POLICY "Users can view own api keys"
  ON public.api_keys FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own API keys
DROP POLICY IF EXISTS "Users can insert own api keys" ON public.api_keys;
CREATE POLICY "Users can insert own api keys"
  ON public.api_keys FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own API keys
DROP POLICY IF EXISTS "Users can delete own api keys" ON public.api_keys;
CREATE POLICY "Users can delete own api keys"
  ON public.api_keys FOR DELETE
  USING (auth.uid() = user_id);

-- Users can view their own transactions
DROP POLICY IF EXISTS "Users can view own transactions" ON public.billing_transactions;
CREATE POLICY "Users can view own transactions"
  ON public.billing_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Auto-create users_profile when user signs up
DROP FUNCTION IF EXISTS public.create_user_profile() CASCADE;
CREATE OR REPLACE FUNCTION public.create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users_profile (id, balance)
  VALUES (NEW.id, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for auto-profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_user_profile();

-- Function to record billing transactions
DROP FUNCTION IF EXISTS public.record_transaction(UUID, TEXT, INTEGER, TEXT, TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.record_transaction(
  p_user_id UUID,
  p_type TEXT,
  p_amount INTEGER,
  p_tool_name TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_stripe_intent_id TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO public.billing_transactions (user_id, type, amount, tool_name, description, stripe_intent_id)
  VALUES (p_user_id, p_type, p_amount, p_tool_name, p_description, p_stripe_intent_id);
  
  -- Update user's balance
  IF p_type IN ('charge', 'deposit', 'auto_recharge', 'refund') THEN
    UPDATE public.users_profile
    SET balance = balance + p_amount
    WHERE id = p_user_id;
    
    -- Update usage this month for charges
    IF p_type = 'charge' THEN
      UPDATE public.users_profile
      SET usage_this_month = usage_this_month + ABS(p_amount)
      WHERE id = p_user_id;
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- SETUP COMPLETE!
-- ============================================================================
-- Tables created:
--   - users_profile (balance, auto_recharge settings, monthly limits)
--   - api_keys (API authentication keys)
--   - billing_transactions (audit trail)
--
-- Features:
--   - Credit-based billing (prepaid funds)
--   - Auto-recharge when balance drops below threshold
--   - Monthly spending limits
--   - API key management
--   - Transaction history
--
-- Next steps:
--   1. Update your pricing in /config/pricing.config.ts
--   2. Run migrations in your app (npm run dev)
--   3. Configure Stripe webhook in Stripe dashboard
--   4. Users can sign up and add funds to their account
-- ============================================================================
