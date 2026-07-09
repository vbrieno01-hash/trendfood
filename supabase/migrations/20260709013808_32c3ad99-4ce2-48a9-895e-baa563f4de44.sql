
ALTER VIEW public.fiscal_usage_current_month SET (security_invoker = on);

DROP POLICY IF EXISTS "cron_health_all_service" ON public.cron_health;
DROP POLICY IF EXISTS "cron_health_service_all" ON public.cron_health;
CREATE POLICY "cron_health_service_all" ON public.cron_health
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "activation_logs_insert_service" ON public.activation_logs;
DROP POLICY IF EXISTS "activation_logs_insert_admin" ON public.activation_logs;
CREATE POLICY "activation_logs_insert_service" ON public.activation_logs
  FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "activation_logs_insert_admin" ON public.activation_logs
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "referral_bonuses_insert_service" ON public.referral_bonuses;
DROP POLICY IF EXISTS "referral_bonuses_insert_admin" ON public.referral_bonuses;
CREATE POLICY "referral_bonuses_insert_service" ON public.referral_bonuses
  FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "referral_bonuses_insert_admin" ON public.referral_bonuses
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "referral_block_logs_insert_service" ON public.referral_block_logs;
CREATE POLICY "referral_block_logs_insert_service" ON public.referral_block_logs
  FOR INSERT TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS "ifood_category_map_insert_service" ON public.ifood_category_map;
CREATE POLICY "ifood_category_map_insert_service" ON public.ifood_category_map
  FOR INSERT TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS "ifood_disputes_insert_service" ON public.ifood_disputes;
CREATE POLICY "ifood_disputes_insert_service" ON public.ifood_disputes
  FOR INSERT TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS "ifood_disputes_update_service" ON public.ifood_disputes;
CREATE POLICY "ifood_disputes_update_service" ON public.ifood_disputes
  FOR UPDATE TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "ifood_event_log_insert_service" ON public.ifood_event_log;
CREATE POLICY "ifood_event_log_insert_service" ON public.ifood_event_log
  FOR INSERT TO service_role WITH CHECK (true);
