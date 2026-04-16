UPDATE orders SET payment_method = 'card_debit'  WHERE LOWER(TRIM(payment_method)) IN ('cartão de débito', 'cartao de debito');
UPDATE orders SET payment_method = 'card_credit' WHERE LOWER(TRIM(payment_method)) IN ('cartão de crédito', 'cartao de credito');
UPDATE orders SET payment_method = 'cash'        WHERE LOWER(TRIM(payment_method)) IN ('dinheiro');
UPDATE orders SET payment_method = 'card'        WHERE LOWER(TRIM(payment_method)) IN ('cartão', 'cartao', 'maquininha na entrega');