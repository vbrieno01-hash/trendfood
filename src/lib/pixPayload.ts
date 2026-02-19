// ─── PIX Payload Builder (EMV / QRCPS-MPM — Banco Central do Brasil) ─────────

function emvField(id: string, value: string): string {
  const len = value.length.toString().padStart(2, "0");
  return `${id}${len}${value}`;
}

function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
    }
  }
  return (crc & 0xffff).toString(16).toUpperCase().padStart(4, "0");
}

export function buildPixPayload(pixKey: string, amount: number, storeName: string): string {
  const merchantAccountInfo = emvField(
    "26",
    emvField("00", "BR.GOV.BCB.PIX") + emvField("01", pixKey)
  );

  const amountStr = amount.toFixed(2);
  const storeNameClean = storeName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .substring(0, 25)
    .toUpperCase()
    .trim() || "LOJA";

  let payload =
    emvField("00", "01") +
    emvField("01", "12") +
    merchantAccountInfo +
    emvField("52", "0000") +
    emvField("53", "986") +
    emvField("54", amountStr) +
    emvField("58", "BR") +
    emvField("59", storeNameClean) +
    emvField("60", "SAO PAULO") +
    emvField("62", emvField("05", "***")) +
    "6304";

  payload += crc16(payload);
  return payload;
}
