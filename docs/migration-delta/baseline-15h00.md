# Baseline pré-migração — 17 jul 2026

## Contagens atuais do projeto (xrzudhylpphnzousilye)

Após o restore no projeto novo, esses números TÊM que bater (ou ser maiores,
se pedidos novos entrarem entre o snapshot e o restore).

| Tabela | 17/07/2026 | 14/07/2026 |
|---|---:|---:|
| auth.users | 26 * | 26 |
| organizations | 20 | 20 |
| profiles | 84 | 83 |
| user_roles | 2 | 2 |
| menu_items | 507 | 432 |
| menu_item_addons | 157 | 157 |
| tables | 11 | 10 |
| orders | 3.586 | 3.429 |
| order_items | 5.612 | 5.341 |
| deliveries | 2.976 | 2.864 |
| coupons | 8 | 8 |
| delivery_neighborhoods | 108 | 98 |
| couriers | 3 | 3 |
| stock_items | 0 | 0 |
| loyalty_points | 86 | 75 |
| reviews | 161 | 153 |
| affiliates | 6 | 6 |
| campaigns | 5 | 5 |
| campaign_credits | 1 | 2 |
| subscription_payments | 2 | 2 |
| whatsapp_instances | 4 | 3 |
| ifood_credentials | 1 | 1 |
| fiscal_config | 1 | 1 |
| platform_plans | 3 | 3 |
| platform_config | 1 | 1 |
| platform_content | 26 | 26 |

\* `auth.users` sem acesso direto pelo psql com esta chave; contagem
preservada do baseline anterior (nenhum signup novo confirmado entre 14 e 17).

## SQL pra re-rodar antes da janela (no PROD)

```sql
SELECT
  (SELECT count(*) FROM auth.users) AS auth_users,
  (SELECT count(*) FROM public.organizations) AS orgs,
  (SELECT count(*) FROM public.orders) AS orders,
  (SELECT count(*) FROM public.order_items) AS order_items,
  (SELECT count(*) FROM public.menu_items) AS menu_items,
  (SELECT count(*) FROM public.profiles) AS profiles,
  (SELECT count(*) FROM public.deliveries) AS deliveries,
  (SELECT count(*) FROM public.campaigns) AS campaigns,
  (SELECT count(*) FROM public.loyalty_points) AS loyalty,
  (SELECT count(*) FROM public.reviews) AS reviews;
```

Salva a saída num arquivo datado e usa como referência final do dump.
