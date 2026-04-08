import { describe, it, expect } from "vitest";
import { buildReceiptData } from "@/lib/receiptData";

describe("buildReceiptData - Retirada vs Entrega", () => {
  const storeInfo = { name: "Test Store" };

  it("should show RETIRADA NO LOCAL, hide address and delivery fee for pickup", () => {
    const order = {
      id: "test-1",
      table_number: 0,
      created_at: new Date().toISOString(),
      notes: "TIPO:Retirada|CLIENTE:Maria Silva|TEL:(11)98888-0000|PGTO:Pix",
      order_items: [{ id: "i1", name: "X-Burguer", quantity: 1, price: 25 }],
    };

    const data = buildReceiptData(order, storeInfo);

    expect(data.locationLabel).toBe("RETIRADA NO LOCAL");
    expect(data.isPickup).toBe(true);
    expect(data.showEta).toBe(false);
    // Address should be stripped for pickup
    expect(data.customer?.address).toBeUndefined();
    expect(data.customer?.bairro).toBeUndefined();
    expect(data.customer?.reference).toBeUndefined();
    // Name and phone should still exist
    expect(data.customer?.name).toBe("Maria Silva");
    expect(data.customer?.phone).toBe("(11)98888-0000");
    // Delivery fee should be zero
    expect(data.totals.deliveryFee).toBe(0);
    expect(data.totals.deliveryFeeLabel).toBe("");
  });

  it("should show PARA ENTREGA with address and delivery fee for delivery", () => {
    const order = {
      id: "test-2",
      table_number: 0,
      created_at: new Date().toISOString(),
      notes: "TIPO:Entrega|CLIENTE:Joao Santos|TEL:(11)97777-0000|END.:Rua das Flores, 123, Apto 4, Centro, Sao Paulo|FRETE:R$ 6,00|PGTO:Dinheiro|TROCO:R$ 50,00",
      order_items: [
        { id: "i1", name: "X-Salada", quantity: 2, price: 20 },
        { id: "i2", name: "Suco de Laranja", quantity: 1, price: 8 },
      ],
    };

    const data = buildReceiptData(order, storeInfo);

    expect(data.locationLabel).toBe("PARA ENTREGA");
    expect(data.isPickup).toBe(false);
    expect(data.showEta).toBe(true);
    // Address should exist
    expect(data.customer?.address).toBeDefined();
    // Delivery fee
    expect(data.totals.deliveryFee).toBe(6);
    expect(data.totals.deliveryFeeLabel).toBe("R$ 6,00");
    // Grand total = 2*20 + 8 + 6 = 54
    expect(data.totals.grandTotal).toBe(54);
    // Troco
    expect(data.troco).toBe("R$ 50,00");
    // trocoChange: 50 - 54 = negative, so undefined
    expect(data.trocoChange).toBeUndefined();
  });

  it("should multiply addon qty by item qty when qty > 1", () => {
    const order = {
      id: "test-addon",
      table_number: 0,
      created_at: new Date().toISOString(),
      notes: "TIPO:Entrega|CLIENTE:Test|PGTO:Pix|FRETE:R$ 5,00",
      order_items: [
        { id: "i1", name: "X-Onion (+ 1x Batata frita R$5,00, + 2x Bacon R$3,00)", quantity: 2, price: 25 },
      ],
    };

    const data = buildReceiptData(order, storeInfo);
    expect(data.items[0].addons).toEqual(["2x Batata frita R$10,00", "4x Bacon R$6,00"]);
  });

  it("should NOT multiply addon qty when item qty is 1", () => {
    const order = {
      id: "test-addon-1",
      table_number: 0,
      created_at: new Date().toISOString(),
      notes: "TIPO:Entrega|CLIENTE:Test|PGTO:Pix",
      order_items: [
        { id: "i1", name: "X-Onion (+ 1x Batata frita R$5,00)", quantity: 1, price: 25 },
      ],
    };

    const data = buildReceiptData(order, storeInfo);
    expect(data.items[0].addons).toEqual(["1x Batata frita R$5,00"]);
  });

  it("should calculate trocoChange correctly when troco > total", () => {
    const order = {
      id: "test-3",
      table_number: 0,
      created_at: new Date().toISOString(),
      notes: "TIPO:Entrega|CLIENTE:Test|PGTO:Dinheiro|TROCO:R$ 100,00|FRETE:R$ 6,00",
      order_items: [{ id: "i1", name: "Item", quantity: 1, price: 35 }],
    };

    const data = buildReceiptData(order, storeInfo);
    // grandTotal = 35 + 6 = 41
    expect(data.totals.grandTotal).toBe(41);
    // trocoChange = 100 - 41 = 59
    expect(data.trocoChange).toBe(59);
  });
});
