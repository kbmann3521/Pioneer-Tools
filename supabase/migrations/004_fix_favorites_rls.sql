-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own favorites" ON public.favorites;
DROP POLICY IF EXISTS "Users can create own favorites" ON public.favorites;
DROP POLICY IF EXISTS "Users can delete own favorites" ON public.favorites;

-- Create new policies that allow service role (no auth context) to manage all favorites
-- Service role will be used by the API, so we don't restrict based on auth.uid()

CREATE POLICY "Anyone can view favorites"
  ON public.favorites FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create favorites"
  ON public.favorites FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can delete favorites"
  ON public.favorites FOR DELETE
  USING (true);

-- Note: Since we're using the service role for API calls, we handle authorization
-- in the API layer (checking the JWT token). The RLS policies just need to allow access.
