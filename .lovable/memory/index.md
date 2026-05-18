# Memory: index.md
Updated: today

# Project Memory

## Core
- SaaS alternative to iFood (zero fees). Target: max merchant profit.
- Terminology: Catálogo (Cardápio), Produção (Cozinha), Vendas (Pedidos).
- Tech: Supabase (RLS, verify_jwt=false for webhooks), Capacitor Android APK.
- Payments: Exclusively Mercado Pago using a CNPJ account.
- DB Security: Enforce via SQL migrations (RLS, triggers, pg_cron) over frontend.
- Admin Panel: Strictly restricted to brenojackson30@gmail.com.
- Theme & Pricing: Premium Live (glassmorphism). platform_plans is pricing truth.

## Memories
$(grep -E '^- \[' /dev-server/.lovable/memory/index.md.bak 2>/dev/null || true)
