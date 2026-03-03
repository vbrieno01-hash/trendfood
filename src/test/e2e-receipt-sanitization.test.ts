import { describe, it, expect } from "vitest";
import { buildReceiptData } from "@/lib/receiptData";
import { formatReceiptText, sanitizeThermalText } from "@/lib/formatReceiptText";

describe("E2E Receipt Sanitization & Calculation", () => {
  const storeInfo = { name: "Rei do Burguer", address: "Caminho Santa Marta, 55, Cubatão", contact: "(13) 99999-0000" };

  const testOrder = {
    id: "test-e2e",
    table_number: 0,
    created_at: new Date().toISOString(),
    order_number: 36,
    notes: "TIPO:Entrega|CLIENTE:Teste Motoboy|TEL:(13)99999-0000|END.:Rua das Flores, 100, Centro, Cubatao, SP|BAIRRO:Centro|FRETE:R$ 6,00|PGTO:Dinheiro|TROCO:R$ 50,00",
    order_items: [
      { id: "i1", name: "X-Burguer (+ Bacon, + Cheddar) | Obs: Sem cebola", quantity: 2, price: 18 },
      { id: "i2", name: "Refrigerante", quantity: 1, price: 7 },
    ],
  };

  it("calculates totals correctly: subtotal + frete = grandTotal", () => {
    const data = buildReceiptData(testOrder, storeInfo);
    expect(data.totals.subtotal).toBe(43); // 2*18 + 7
    expect(data.totals.deliveryFee).toBe(6);
    expect(data.totals.grandTotal).toBe(49); // 43 + 6
  });

  it("calculates trocoChange correctly", () => {
    const data = buildReceiptData(testOrder, storeInfo);
    expect(data.troco).toBe("R$ 50,00");
    expect(data.trocoChange).toBe(1); // 50 - 49 = 1
  });

  it("parses addons and per-item obs", () => {
    const data = buildReceiptData(testOrder, storeInfo);
    expect(data.items[0].baseName).toBe("X-Burguer");
    expect(data.items[0].addons).toEqual(["Bacon", "Cheddar"]);
    expect(data.items[0].itemObs).toBe("Sem cebola");
  });

  it("shows PARA ENTREGA with full address for delivery", () => {
    const data = buildReceiptData(testOrder, storeInfo);
    expect(data.locationLabel).toBe("PARA ENTREGA");
    expect(data.isPickup).toBe(false);
    expect(data.customer?.address).toBeDefined();
    expect(data.showEta).toBe(true);
  });

  it("sanitized text has NO accents, NO ç, is ALL UPPERCASE", () => {
    const text = formatReceiptText(testOrder, storeInfo);
    // No diacritics
    expect(text).not.toMatch(/[àáâãäéèêëíìîïóòôõöúùûüçñ]/i);
    // All uppercase (ignore markers and whitespace)
    const cleaned = text.replace(/##(CENTER|BOLD)##/g, "").trim();
    const letters = cleaned.replace(/[^a-zA-Z]/g, "");
    expect(letters).toBe(letters.toUpperCase());
  });

  it("contains troco and levar de troco lines", () => {
    const text = formatReceiptText(testOrder, storeInfo);
    expect(text).toContain("TROCO PARA");
    expect(text).toContain("LEVAR DE TROCO");
  });

  it("contains the footer URL", () => {
    const text = formatReceiptText(testOrder, storeInfo);
    expect(text).toContain("HTTPS://TRENDFOOD.LOVABLE.APP/");
  });

  it("sanitizeThermalText removes ç and accents", () => {
    expect(sanitizeThermalText("Refeição à moda")).toBe("REFEICAO A MODA");
    expect(sanitizeThermalText("Previsão")).toBe("PREVISAO");
  });

  it("pickup hides address and delivery fee", () => {
    const pickupOrder = {
      ...testOrder,
      notes: "TIPO:Retirada|CLIENTE:Maria|TEL:(11)98888-0000|PGTO:Pix",
    };
    const data = buildReceiptData(pickupOrder, storeInfo);
    expect(data.locationLabel).toBe("RETIRADA NO LOCAL");
    expect(data.customer?.address).toBeUndefined();
    expect(data.totals.deliveryFee).toBe(0);
    expect(data.totals.deliveryFeeLabel).toBe("");
  });
});
