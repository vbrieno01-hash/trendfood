-- Reset Lanchonete RM: sessão UazAPI morreu, força re-pareamento QR
UPDATE public.whatsapp_instances
   SET status='disconnected', connected_at=NULL, phone_connected=NULL
 WHERE organization_id='6988dee2-483e-4b9d-aa71-50ac11a8c758';

-- Limpa mensagens presas na fila (evita retries inúteis contra sessão morta)
UPDATE public.whatsapp_outbox
   SET status='skipped',
       last_error=COALESCE(last_error,'') || ' [manual skip: session dead, awaiting QR re-pair]'
 WHERE organization_id='6988dee2-483e-4b9d-aa71-50ac11a8c758'
   AND status IN ('failed','pending','processing');