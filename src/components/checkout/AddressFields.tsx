import { useState, useEffect, useCallback, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MapPin, Loader2, LocateFixed, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface AddressCandidate {
  cep: string;
  street: string;
  neighborhood: string;
  city: string;
  state: string;
}

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
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState("");
  const [candidates, setCandidates] = useState<AddressCandidate[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const skipCandidateClear = useRef(false);

  const update = useCallback(
    (field: keyof AddressData, val: string) => {
      onChange({ ...value, [field]: val });
      // Clear candidates when user manually changes CEP
      if (field === "cep" && !skipCandidateClear.current) {
        setCandidates([]);
        setSelectedIdx(null);
      }
    },
    [value, onChange],
  );

  const handleSelectCandidate = useCallback(
    (candidate: AddressCandidate, idx: number) => {
      skipCandidateClear.current = true;
      setSelectedIdx(idx);
      onChange({
        ...value,
        cep: formatCep(candidate.cep),
        street: candidate.street || value.street,
        neighborhood: candidate.neighborhood || value.neighborhood,
        city: candidate.city || value.city,
        state: candidate.state || value.state,
      });
      setTimeout(() => { skipCandidateClear.current = false; }, 100);
    },
    [value, onChange],
  );

  const handleGetLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError("Seu navegador não suporta geolocalização.");
      return;
    }
    setGpsLoading(true);
    setGpsError("");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { data, error } = await supabase.functions.invoke("reverse-geocode", {
            body: { lat: pos.coords.latitude, lon: pos.coords.longitude },
          });
          if (error || data?.error) {
            setGpsError(data?.error || "Não foi possível obter o endereço.");
            return;
          }
          skipCandidateClear.current = true;
          onChange({
            ...value,
            cep: data.cep ? formatCep(data.cep) : value.cep,
            street: data.street || value.street,
            neighborhood: data.neighborhood || value.neighborhood,
            city: data.city || value.city,
            state: data.state || value.state,
          });
          setTimeout(() => { skipCandidateClear.current = false; }, 100);
          // Populate candidates from reverse-geocode
          if (data.candidates && Array.isArray(data.candidates) && data.candidates.length > 1) {
            setCandidates(data.candidates.slice(0, 5).map((c: any) => ({
              cep: c.cep || "",
              street: c.street || c.logradouro || "",
              neighborhood: c.neighborhood || c.bairro || "",
              city: c.city || data.city || "",
              state: c.state || data.state || "",
            })));
            setSelectedIdx(null);
          }
        } catch {
          setGpsError("Erro ao buscar endereço pela localização.");
        } finally {
          setGpsLoading(false);
        }
      },
      (err) => {
        setGpsLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGpsError("Permissão de localização negada.");
        } else {
          setGpsError("Não foi possível obter sua localização.");
        }
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }, [value, onChange]);

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
        skipCandidateClear.current = true;
        onChange({
          ...value,
          street: data.logradouro || value.street,
          neighborhood: data.bairro || value.neighborhood,
          city: data.localidade || value.city,
          state: data.uf || value.state,
        });
        setTimeout(() => { skipCandidateClear.current = false; }, 100);
        // Populate candidates from viacep-proxy nearby
        if (data.nearby && Array.isArray(data.nearby) && data.nearby.length > 1) {
          setCandidates(data.nearby.slice(0, 5).map((n: any) => ({
            cep: n.cep || "",
            street: n.street || n.logradouro || "",
            neighborhood: n.neighborhood || n.bairro || "",
            city: n.city || data.localidade || "",
            state: n.state || data.uf || "",
          })));
          setSelectedIdx(null);
        }
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
      {/* GPS Button */}
      <Button
        type="button"
        variant="outline"
        className="w-full gap-2"
        onClick={handleGetLocation}
        disabled={gpsLoading}
      >
        {gpsLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <LocateFixed className="w-4 h-4" />
        )}
        {gpsLoading ? "Buscando localização..." : "Usar minha localização"}
      </Button>
      {gpsError && <p className="text-xs text-destructive">{gpsError}</p>}

      {/* Candidate cards */}
      {candidates.length > 1 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium">Selecione o endereço correto:</p>
          <div className="grid gap-2">
            {candidates.map((c, idx) => {
              const isSelected = selectedIdx === idx;
              return (
                <button
                  key={`${c.cep}-${c.neighborhood}-${idx}`}
                  type="button"
                  onClick={() => handleSelectCandidate(c, idx)}
                  className={`relative flex items-start gap-2 rounded-xl border p-3 text-left transition-colors ${
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  <MapPin className={`w-4 h-4 mt-0.5 shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-medium truncate ${isSelected ? "text-primary" : "text-foreground"}`}>
                      {c.street ? `${c.street}, ${c.neighborhood}` : c.neighborhood}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatCep(c.cep)}</p>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

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
