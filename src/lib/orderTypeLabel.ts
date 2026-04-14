/**
 * Centralized order type label based on table_number.
 * -1 = Balcão, 0 = Entrega, 1+ = Mesa N
 */
export const getOrderTypeLabel = (tn: number) =>
  tn === -1 ? "🛒 Balcão" : tn === 0 ? "🛵 Entrega" : `Mesa ${tn}`;

export const getOrderTypeLabelUpper = (tn: number) =>
  tn === -1 ? "🛒 BALCÃO" : tn === 0 ? "🛵 ENTREGA" : `Mesa ${tn}`;
