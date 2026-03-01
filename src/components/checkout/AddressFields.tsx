import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export interface AddressData {
  cep: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
}

export const EMPTY_ADDRESS: AddressData = {
  cep: "",
  street: "",
  number: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "",
};

export function buildAddressString(a: AddressData): string {
  return [a.street, a.number, a.complement, a.neighborhood, a.city, a.state, a.cep, "Brasil"]
    .map((p) => p.trim())
    .filter(Boolean)
    .join(", ");
}

export function isAddressValid(a: AddressData): boolean {
  return !!(a.cep.replace(/\D/g, "").length === 8 && a.street.trim() && a.number.trim() && a.city.trim() && a.state.trim());
}

const formatCep = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
};

interface Props {
  value: AddressData;
  onChange: (addr: AddressData) => void;
}

export default function AddressFields({ value, onChange }: Props) {
  const [loading, setLoading] = useState(false);
  const [cepError, setCepError] = useState("");

  const update = useCallback(
    (field: keyof AddressData, val: string) => {
      onChange({ ...value, [field]: val });
    },
    [value, onChange],
  );

  // Auto-fetch when CEP has 8 digits
  useEffect(() => {
    const digits = value.cep.replace(/\D/g, "");
    if (digits.length !== 8) return;

    let cancelled = false;
    const fetchCep = async () => {
      setLoading(true);
      setCepError("");
      try {
        const { data, error } = await supabase.functions.invoke("viacep-proxy", {
          body: { cep: digits },
        });
        if (cancelled) return;
        if (error || data?.error) {
          setCepError(data?.error || "CEP não encontrado");
          return;
        }
        onChange({
          ...value,
          street: data.logradouro || value.street,
          neighborhood: data.bairro || value.neighborhood,
          city: data.localidade || value.city,
          state: data.uf || value.state,
        });
      } catch {
        if (!cancelled) setCepError("Erro ao buscar CEP");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchCep();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.cep]);

  return (
    <div className="space-y-3">
      {/* CEP */}
      <div className="space-y-1.5">
        <Label htmlFor="ck-cep" className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-muted-foreground" /> CEP
        </Label>
        <div className="relative">
          <Input
            id="ck-cep"
            placeholder="00000-000"
            inputMode="numeric"
            value={value.cep}
            onChange={(e) => update("cep", formatCep(e.target.value))}
          />
          {loading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
          )}
        </div>
        {cepError && <p className="text-xs text-destructive">{cepError}</p>}
      </div>

      {/* Rua */}
      <div className="space-y-1.5">
        <Label htmlFor="ck-street">Rua</Label>
        <Input
          id="ck-street"
          placeholder="Nome da rua"
          value={value.street}
          onChange={(e) => update("street", e.target.value)}
        />
      </div>

      {/* Número + Complemento */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="ck-number">Número</Label>
          <Input
            id="ck-number"
            placeholder="123"
            value={value.number}
            onChange={(e) => update("number", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ck-complement">Complemento</Label>
          <Input
            id="ck-complement"
            placeholder="Apto, bloco..."
            value={value.complement}
            onChange={(e) => update("complement", e.target.value)}
          />
        </div>
      </div>

      {/* Bairro */}
      <div className="space-y-1.5">
        <Label htmlFor="ck-neighborhood">Bairro</Label>
        <Input
          id="ck-neighborhood"
          placeholder="Bairro"
          value={value.neighborhood}
          onChange={(e) => update("neighborhood", e.target.value)}
        />
      </div>

      {/* Cidade + Estado */}
      <div className="grid grid-cols-[1fr_80px] gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="ck-city">Cidade</Label>
          <Input
            id="ck-city"
            placeholder="Cidade"
            value={value.city}
            onChange={(e) => update("city", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ck-state">UF</Label>
          <Input
            id="ck-state"
            placeholder="SP"
            maxLength={2}
            value={value.state}
            onChange={(e) => update("state", e.target.value.toUpperCase())}
          />
        </div>
      </div>
    </div>
  );
}
