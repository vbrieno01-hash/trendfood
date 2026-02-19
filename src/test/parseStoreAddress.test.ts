import { describe, it, expect } from "vitest";
import { parseStoreAddress } from "@/lib/storeAddress";

describe("parseStoreAddress", () => {
  it("full address with complement", () => {
    const r = parseStoreAddress("01001-000, Rua X, 100, Apto 4, Centro, Sao Paulo, SP, Brasil");
    expect(r).toEqual({ cep: "01001-000", street: "Rua X", number: "100", complement: "Apto 4", neighborhood: "Centro", city: "Sao Paulo", state: "SP" });
  });

  it("no complement (7 parts)", () => {
    const r = parseStoreAddress("01001-000, Rua X, 100, Centro, Sao Paulo, SP, Brasil");
    expect(r).toEqual({ cep: "01001-000", street: "Rua X", number: "100", complement: "", neighborhood: "Centro", city: "Sao Paulo", state: "SP" });
  });

  it("minimal from wizard (4 parts)", () => {
    const r = parseStoreAddress("01001000, 100, SP, Brasil");
    expect(r).toEqual({ cep: "01001000", street: "", number: "", complement: "", neighborhood: "", city: "100", state: "SP" });
  });

  it("legacy no-CEP (5 parts)", () => {
    const r = parseStoreAddress("Rua X, 100, Centro, Sao Paulo, SP");
    expect(r).toEqual({ cep: "", street: "Rua X", number: "100", complement: "", neighborhood: "Centro", city: "Sao Paulo", state: "SP" });
  });

  it("empty string", () => {
    const r = parseStoreAddress("");
    expect(r).toEqual({ cep: "", street: "", number: "", complement: "", neighborhood: "", city: "", state: "" });
  });
});
