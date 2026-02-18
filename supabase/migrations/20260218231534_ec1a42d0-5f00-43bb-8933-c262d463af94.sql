
-- Fix: Convert all RLS policies from RESTRICTIVE to PERMISSIVE

-- organizations
DROP POLICY IF EXISTS organizations_select_public ON public.organizations;
DROP POLICY IF EXISTS organizations_insert_own ON public.organizations;
DROP POLICY IF EXISTS organizations_update_own ON public.organizations;
DROP POLICY IF EXISTS organizations_delete_own ON public.organizations;

CREATE POLICY organizations_select_public ON public.organizations FOR SELECT USING (true);
CREATE POLICY organizations_insert_own ON public.organizations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY organizations_update_own ON public.organizations FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY organizations_delete_own ON public.organizations FOR DELETE USING (auth.uid() = user_id);

-- profiles
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;

CREATE POLICY profiles_select_own ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY profiles_insert_own ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- suggestions
DROP POLICY IF EXISTS suggestions_select_public ON public.suggestions;
DROP POLICY IF EXISTS suggestions_insert_public ON public.suggestions;
DROP POLICY IF EXISTS suggestions_update_org_owner ON public.suggestions;
DROP POLICY IF EXISTS suggestions_delete_org_owner ON public.suggestions;

CREATE POLICY suggestions_select_public ON public.suggestions FOR SELECT USING (true);
CREATE POLICY suggestions_insert_public ON public.suggestions FOR INSERT WITH CHECK (true);
CREATE POLICY suggestions_update_org_owner ON public.suggestions FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.organizations WHERE organizations.id = suggestions.organization_id AND organizations.user_id = auth.uid()));
CREATE POLICY suggestions_delete_org_owner ON public.suggestions FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.organizations WHERE organizations.id = suggestions.organization_id AND organizations.user_id = auth.uid()));
