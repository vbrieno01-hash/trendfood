
-- ============================================================
-- Hardening de segurança do Fluxo de Caixa
-- Triggers de integridade + remoção de DELETE do owner
-- 100% aditiva. Não altera dados existentes.
-- ============================================================

-- 1) Remover DELETE do owner (audit trail). Admin continua podendo.
DROP POLICY IF EXISTS cash_sessions_delete_owner ON public.cash_sessions;
DROP POLICY IF EXISTS cash_withdrawals_delete_owner ON public.cash_withdrawals;

-- 2) Trigger de integridade em cash_sessions
CREATE OR REPLACE FUNCTION public.enforce_cash_session_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin boolean;
BEGIN
  is_admin := auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'::app_role);

  IF TG_OP = 'INSERT' THEN
    -- Admin pode setar opened_by livremente. Owner: força = auth.uid().
    IF NOT is_admin THEN
      IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Autenticação obrigatória para abrir caixa';
      END IF;
      NEW.opened_by := auth.uid();
      -- Turno sempre nasce aberto
      NEW.closed_at := NULL;
      NEW.closed_by := NULL;
      NEW.closing_balance := NULL;
      NEW.divergence_reason := NULL;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- Admin passa livre (bypass emergencial)
    IF is_admin THEN
      RETURN NEW;
    END IF;

    -- Imutáveis após criação
    IF NEW.opened_at IS DISTINCT FROM OLD.opened_at THEN
      RAISE EXCEPTION 'opened_at é imutável';
    END IF;
    IF NEW.opening_balance IS DISTINCT FROM OLD.opening_balance THEN
      RAISE EXCEPTION 'opening_balance é imutável';
    END IF;
    IF NEW.opened_by IS DISTINCT FROM OLD.opened_by THEN
      RAISE EXCEPTION 'opened_by é imutável';
    END IF;
    IF NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
      RAISE EXCEPTION 'organization_id é imutável';
    END IF;

    -- Bloqueia reabrir turno já fechado
    IF OLD.closed_at IS NOT NULL THEN
      RAISE EXCEPTION 'Turno já fechado não pode ser alterado';
    END IF;

    -- Ao fechar, força closed_by = auth.uid()
    IF NEW.closed_at IS NOT NULL THEN
      IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Autenticação obrigatória para fechar caixa';
      END IF;
      NEW.closed_by := auth.uid();
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_cash_session_integrity ON public.cash_sessions;
CREATE TRIGGER trg_enforce_cash_session_integrity
  BEFORE INSERT OR UPDATE ON public.cash_sessions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_cash_session_integrity();

-- 3) Trigger de integridade em cash_withdrawals
CREATE OR REPLACE FUNCTION public.enforce_cash_withdrawal_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin boolean;
  session_closed_at timestamptz;
  session_org uuid;
BEGIN
  is_admin := auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'::app_role);

  IF TG_OP = 'INSERT' THEN
    SELECT closed_at, organization_id
      INTO session_closed_at, session_org
      FROM public.cash_sessions
     WHERE id = NEW.session_id;

    IF session_org IS NULL THEN
      RAISE EXCEPTION 'Sessão de caixa não encontrada';
    END IF;

    IF session_org IS DISTINCT FROM NEW.organization_id THEN
      RAISE EXCEPTION 'organization_id da movimentação não bate com a sessão';
    END IF;

    IF session_closed_at IS NOT NULL AND NOT is_admin THEN
      RAISE EXCEPTION 'Não é possível adicionar movimentação em turno fechado';
    END IF;

    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF is_admin THEN
      RETURN NEW;
    END IF;
    -- Movimentações são imutáveis para owner (audit trail)
    IF NEW.session_id IS DISTINCT FROM OLD.session_id
       OR NEW.organization_id IS DISTINCT FROM OLD.organization_id
       OR NEW.amount IS DISTINCT FROM OLD.amount
       OR NEW.movement_type IS DISTINCT FROM OLD.movement_type THEN
      RAISE EXCEPTION 'Campos críticos da movimentação são imutáveis';
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_cash_withdrawal_integrity ON public.cash_withdrawals;
CREATE TRIGGER trg_enforce_cash_withdrawal_integrity
  BEFORE INSERT OR UPDATE ON public.cash_withdrawals
  FOR EACH ROW EXECUTE FUNCTION public.enforce_cash_withdrawal_integrity();
