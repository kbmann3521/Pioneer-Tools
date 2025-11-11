-- Create table for tracking API snippet validation results
CREATE TABLE public.api_snippet_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_id TEXT NOT NULL,
  language TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failure', 'pending')),
  error_message TEXT,
  last_validated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(tool_id, language)
);

-- Create index for faster lookups
CREATE INDEX idx_api_snippet_validations_tool_id ON public.api_snippet_validations(tool_id);
CREATE INDEX idx_api_snippet_validations_tool_language ON public.api_snippet_validations(tool_id, language);

-- Enable RLS
ALTER TABLE public.api_snippet_validations ENABLE ROW LEVEL SECURITY;

-- Public read policy - anyone can see validation status
CREATE POLICY "Anyone can view snippet validations"
  ON public.api_snippet_validations
  FOR SELECT
  USING (true);

-- Service role only can insert/update - for GitHub Actions
CREATE POLICY "Service role can update validations"
  ON public.api_snippet_validations
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can update validation records"
  ON public.api_snippet_validations
  FOR UPDATE
  USING (auth.role() = 'service_role');
