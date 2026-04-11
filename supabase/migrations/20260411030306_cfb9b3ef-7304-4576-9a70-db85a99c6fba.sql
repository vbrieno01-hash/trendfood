ALTER TABLE public.organizations
ADD COLUMN paused_categories jsonb DEFAULT '[]'::jsonb;