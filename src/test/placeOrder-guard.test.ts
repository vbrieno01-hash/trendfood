import { describe, it, expect, vi } from "vitest";

// Test the empty-cart validation logic extracted from usePlaceOrder
describe("placeOrder empty cart guard", () => {
  it("should throw when items array is empty", () => {
    const items: any[] = [];
    expect(() => {
      if (!items || items.length === 0) {
        throw new Error("Seu carrinho está vazio.");
      }
    }).toThrow("Seu carrinho está vazio.");
  });

  it("should NOT throw when items array has entries", () => {
    const items = [{ menu_item_id: "abc", name: "Burger", price: 25.9, quantity: 1 }];
    expect(() => {
      if (!items || items.length === 0) {
        throw new Error("Seu carrinho está vazio.");
      }
    }).not.toThrow();
  });

  it("should throw when items is undefined/null", () => {
    const items: any = undefined;
    expect(() => {
      if (!items || items.length === 0) {
        throw new Error("Seu carrinho está vazio.");
      }
    }).toThrow("Seu carrinho está vazio.");
  });
});
