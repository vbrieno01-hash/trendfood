import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Guard para handlers de input no Safari iOS: quando o usuário cola/digita
 * muito rápido, o Safari dispara o evento com `target: null` e quebra
 * `e.target.value`. Uso: `onChange={safeInput((v) => setName(v))}`.
 */
export function safeInput<
  E extends { target: { value: string } | null } | { target?: { value?: string } | null }
>(handler: (value: string) => void): (e: E) => void {
  return (e: E) => {
    const target = (e as { target?: { value?: string } | null } | null)?.target;
    if (!target || typeof target.value !== "string") return;
    handler(target.value);
  };
}
