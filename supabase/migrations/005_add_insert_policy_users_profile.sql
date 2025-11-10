-- Add INSERT policy for users_profile table
-- This allows users to create their own profile during signup/checkout

CREATE POLICY "Users can create own profile"
  ON public.users_profile FOR INSERT
  WITH CHECK (auth.uid() = id);
