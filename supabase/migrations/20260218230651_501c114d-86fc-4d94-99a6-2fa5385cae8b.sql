
-- =============================================
-- FULL REBUILD MIGRATION
-- Fix RLS policies, add profiles, add columns to organizations
-- =============================================

-- 1. Drop all existing RESTRICTIVE policies from organizations
DROP POLICY IF EXISTS "Public can view organizations by slug" ON public.organizations;
DROP POLICY IF EXISTS "Users can insert their own organization" ON public.organizations;
DROP POLICY IF EXISTS "Users can update their own organization" ON public.organizations;
DROP POLICY IF EXISTS "Users can view their own organization" ON public.organizations;

-- 2. Drop all existing RESTRICTIVE policies from suggestions
DROP POLICY IF EXISTS "Anyone can insert suggestions" ON public.suggestions;
DROP POLICY IF EXISTS "Anyone can view suggestions" ON public.suggestions;
DROP POLICY IF EXISTS "Org owners can update suggestions" ON public.suggestions;

-- 3. Recreate organizations policies as PERMISSIVE
CREATE POLICY "organizations_select_public" ON public.organizations
  AS PERMISSIVE FOR SELECT TO public
  USING (true);

CREATE POLICY "organizations_insert_own" ON public.organizations
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "organizations_update_own" ON public.organizations
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "organizations_delete_own" ON public.organizations
  AS PERMISSIVE FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 4. Recreate suggestions policies as PERMISSIVE
CREATE POLICY "suggestions_select_public" ON public.suggestions
  AS PERMISSIVE FOR SELECT TO public
  USING (true);

CREATE POLICY "suggestions_insert_public" ON public.suggestions
  AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (true);

CREATE POLICY "suggestions_update_org_owner" ON public.suggestions
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organizations
      WHERE organizations.id = suggestions.organization_id
        AND organizations.user_id = auth.uid()
    )
  );

CREATE POLICY "suggestions_delete_org_owner" ON public.suggestions
  AS PERMISSIVE FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organizations
      WHERE organizations.id = suggestions.organization_id
        AND organizations.user_id = auth.uid()
    )
  );

-- 5. Add new columns to organizations
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS primary_color TEXT NOT NULL DEFAULT '#f97316',
  ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- 6. Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own" ON public.profiles
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "profiles_insert_own" ON public.profiles
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profiles_update_own" ON public.profiles
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 7. Storage policies for logos bucket (already exists)
-- Ensure public SELECT is allowed
DROP POLICY IF EXISTS "logos_select_public" ON storage.objects;
DROP POLICY IF EXISTS "logos_insert_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "logos_update_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "logos_delete_authenticated" ON storage.objects;

CREATE POLICY "logos_select_public" ON storage.objects
  AS PERMISSIVE FOR SELECT TO public
  USING (bucket_id = 'logos');

CREATE POLICY "logos_insert_authenticated" ON storage.objects
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'logos');

CREATE POLICY "logos_update_authenticated" ON storage.objects
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (bucket_id = 'logos');

CREATE POLICY "logos_delete_authenticated" ON storage.objects
  AS PERMISSIVE FOR DELETE TO authenticated
  USING (bucket_id = 'logos');

-- 8. Auto-timestamp trigger for profiles
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 9. RPC to increment votes safely
CREATE OR REPLACE FUNCTION public.increment_vote(suggestion_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.suggestions
  SET votes = votes + 1
  WHERE id = suggestion_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
