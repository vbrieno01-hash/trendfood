
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS single_choice_addons boolean NOT NULL DEFAULT false;

ALTER TABLE public.global_addons
  ADD COLUMN IF NOT EXISTS single_choice boolean;

ALTER TABLE public.menu_item_addons
  ADD COLUMN IF NOT EXISTS single_choice boolean;

COMMENT ON COLUMN public.organizations.single_choice_addons IS 'Global switch: when true, ALL addons behave as single-choice unless overridden per addon';
COMMENT ON COLUMN public.global_addons.single_choice IS 'NULL = inherit from organizations.single_choice_addons; true/false = override';
COMMENT ON COLUMN public.menu_item_addons.single_choice IS 'NULL = inherit from organizations.single_choice_addons; true/false = override';
