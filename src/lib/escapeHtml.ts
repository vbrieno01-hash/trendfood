/**
 * Escapa caracteres HTML perigosos para evitar XSS ao injetar
 * strings vindas do banco (nome de loja, item, endereço, etc.)
 * dentro de HTML gerado via template literals em relatórios PDF.
 *
 * Uso: `<td>${esc(org.name)}</td>` em vez de `<td>${org.name}</td>`.
 * Aceita null/undefined/number e sempre retorna string.
 */
export function esc(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}