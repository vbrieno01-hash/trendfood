
-- 1. Enum de roles
CREATE TYPE public.app_role AS ENUM ('admin');

-- 2. Tabela user_roles separada (boas práticas de segurança)
CREATE TABLE public.user_roles (
  id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role    app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Função SECURITY DEFINER para checar role (evita recursão de RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 4. RLS da user_roles — somente admin pode ver roles (leitura protegida)
CREATE POLICY "user_roles_select_admin"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- 5. Corrigir RLS da platform_config — somente admin pode fazer UPDATE
DROP POLICY IF EXISTS "platform_config_update_authed" ON public.platform_config;
CREATE POLICY "platform_config_update_admin"
  ON public.platform_config FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 6. Inserir role admin para o usuário admin existente
INSERT INTO public.user_roles (user_id, role)
VALUES ('ccdbec3f-f8fb-46fd-9613-3350f60ed324', 'admin')
ON CONFLICT DO NOTHING;
