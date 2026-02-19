
ALTER TABLE organizations
ADD COLUMN trial_ends_at timestamptz DEFAULT (now() + interval '7 days');

-- Lojas existentes: remover trial (ja estao no free definitivo)
UPDATE organizations SET trial_ends_at = NULL;
