const BRAZIL_STATES = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"
];

export interface AddressFields {
  cep: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
}

export const EMPTY_ADDRESS: AddressFields = {
  cep: "", street: "", number: "", complement: "", neighborhood: "", city: "", state: ""
};

/**
 * Build a structured store address string in the format:
 * CEP, Rua, Número, Complemento, Bairro, Cidade, Estado, Brasil
 */
export function buildStoreAddress(f: AddressFields): string {
  const parts = [f.cep, f.street, f.number, f.complement, f.neighborhood, f.city, f.state, "Brasil"]
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.join(", ");
}

/**
 * Parse a stored address string back into structured fields.
 * Handles both new (CEP-first) and legacy formats.
 */
export function parseStoreAddress(address: string): AddressFields {
  const parts = address.split(",").map((p) => p.trim());
  if (parts.length >= 6 && BRAZIL_STATES.includes(parts[parts.length - 2])) {
    const withoutBrasil = parts[parts.length - 1].toLowerCase() === "brasil" ? parts.slice(0, -1) : parts;
    const state = withoutBrasil[withoutBrasil.length - 1];
    const city = withoutBrasil[withoutBrasil.length - 2];
    const neighborhood = withoutBrasil[withoutBrasil.length - 3] ?? "";

    const firstPart = withoutBrasil[0] ?? "";
    const isCep = /^\d{5}-?\d{3}$/.test(firstPart);

    if (isCep) {
      const cep = firstPart;
      const street = withoutBrasil[1] ?? "";
      const number = withoutBrasil[2] ?? "";
      const complement = withoutBrasil.length >= 7 ? withoutBrasil[3] : "";
      return { cep, street, number, complement, neighborhood, city, state };
    }

    const number = withoutBrasil[1] ?? "";
    const street = firstPart;
    const complement = withoutBrasil.length === 6 ? withoutBrasil[2] : "";
    return { cep: "", street, number, complement, neighborhood, city, state };
  }
  return { cep: "", street: address, number: "", complement: "", neighborhood: "", city: "", state: "" };
}

/**
 * Infer the Brazilian state (UF) from the first 2 digits of a CEP.
 * Useful as fallback when ViaCEP is unavailable.
 */
export function getStateFromCep(cep: string): string {
  const prefix = parseInt(cep.replace(/\D/g, "").substring(0, 2), 10);
  if (isNaN(prefix)) return "";
  if (prefix >= 1 && prefix <= 19) return "SP";
  if (prefix >= 20 && prefix <= 28) return "RJ";
  if (prefix === 29) return "ES";
  if (prefix >= 30 && prefix <= 39) return "MG";
  if (prefix >= 40 && prefix <= 48) return "BA";
  if (prefix === 49) return "SE";
  if (prefix >= 50 && prefix <= 56) return "PE";
  if (prefix === 57) return "AL";
  if (prefix === 58) return "PB";
  if (prefix === 59) return "RN";
  if (prefix >= 60 && prefix <= 63) return "CE";
  if (prefix === 64) return "PI";
  if (prefix === 65) return "MA";
  if (prefix === 66 || prefix === 67) return "PA";
  if (prefix === 68) return "AP";
  if (prefix === 69) return "AM";
  if (prefix >= 70 && prefix <= 73) return "DF";
  if (prefix >= 74 && prefix <= 76) return "GO";
  if (prefix === 77) return "TO";
  if (prefix === 78) return "MT";
  if (prefix === 79) return "MS";
  if (prefix >= 80 && prefix <= 87) return "PR";
  if (prefix >= 88 && prefix <= 89) return "SC";
  if (prefix >= 90 && prefix <= 99) return "RS";
  return "";
}
