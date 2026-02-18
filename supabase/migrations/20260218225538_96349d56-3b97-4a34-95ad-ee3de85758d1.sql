
-- Create organizations table
CREATE TABLE public.organizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  emoji TEXT NOT NULL DEFAULT '🍽️',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create suggestions table
CREATE TABLE public.suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  votes INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suggestions ENABLE ROW LEVEL SECURITY;

-- RLS policies for organizations
CREATE POLICY "Users can view their own organization"
  ON public.organizations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own organization"
  ON public.organizations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own organization"
  ON public.organizations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Public can view organizations by slug"
  ON public.organizations FOR SELECT
  USING (true);

-- RLS policies for suggestions
CREATE POLICY "Anyone can view suggestions"
  ON public.suggestions FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert suggestions"
  ON public.suggestions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Org owners can update suggestions"
  ON public.suggestions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.organizations
      WHERE organizations.id = suggestions.organization_id
        AND organizations.user_id = auth.uid()
    )
  );
