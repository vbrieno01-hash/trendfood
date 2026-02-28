/// <reference types="vite/client" />

interface MercadoPagoCardTokenData {
  cardNumber: string;
  cardholderName: string;
  cardExpirationMonth: string;
  cardExpirationYear: string;
  securityCode: string;
  identificationType: string;
  identificationNumber: string;
}

interface MercadoPagoInstance {
  createCardToken(data: MercadoPagoCardTokenData): Promise<{ id: string }>;
}

declare class MercadoPago {
  constructor(publicKey: string, options?: { locale?: string });
  createCardToken(data: MercadoPagoCardTokenData): Promise<{ id: string }>;
}

interface Window {
  MercadoPago: typeof MercadoPago;
}
