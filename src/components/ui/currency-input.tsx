import * as React from "react";
import { cn } from "@/lib/utils";

interface CurrencyInputProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
  id?: string;
  required?: boolean;
  placeholder?: string;
}

export function CurrencyInput({ value, onChange, className, id, required, placeholder }: CurrencyInputProps) {
  const cents = Math.round(value * 100);
  const display = formatCents(cents);

  function formatCents(c: number): string {
    const str = String(Math.max(0, c)).padStart(3, "0");
    return str.slice(0, -2) + "," + str.slice(-2);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, "");
    const newCents = parseInt(digits || "0", 10);
    onChange(newCents / 100);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    // Allow navigation, delete, backspace, tab
    if (["Backspace", "Delete", "Tab", "ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
    // Allow Ctrl/Cmd shortcuts
    if (e.ctrlKey || e.metaKey) return;
    // Block non-digit keys
    if (!/^\d$/.test(e.key)) {
      e.preventDefault();
    }
  }

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground select-none">
        R$
      </span>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        value={display}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        required={required}
        placeholder={placeholder}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
      />
    </div>
  );
}
