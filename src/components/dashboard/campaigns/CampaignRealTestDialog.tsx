import { useState } from "react";
import { Loader2, Send, Users, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
  orgId: string;
  orgName: string;
  creditsAvailable: number;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const MAX_PHONES = 5;

const buildDefaultTemplate = (loja: string) =>
  `Oi! Esse é um teste real da campanha da ${loja} 🍔\nSe você recebeu isso, o disparo está funcionando perfeitamente.`;

function normalizePhone(p: string) {
  return p.replace(/\D/g, "");
}

function isValidPhone(p: string) {
  const n = normalizePhone(p);
  return n.length >= 10 && n.length <= 13;
}

export default function CampaignRealTestDialog({
  orgId,
  orgName,
  creditsAvailable,
  open,
  onOpenChange,
}: Props) {
  const qc = useQueryClient();
  const [name, setName] = useState(
    `Teste real ${new Date().toLocaleDateString("pt-BR")}`,
  );
  const [template, setTemplate] = useState(() => buildDefaultTemplate(orgName || "sua loja"));
  const [phones, setPhones] = useState<string[]>([]);
  const [phoneInput, setPhoneInput] = useState("");
  const [sending, setSending] = useState(false);

  const preview = template.split("{loja}").join(orgName);
  const cost = phones.length;
  const canSend =
    !sending &&
    name.trim().length > 0 &&
    template.trim().length > 0 &&
    phones.length > 0 &&
    cost <= creditsAvailable;

  function addPhone() {
    const raw = phoneInput.trim();
    if (!raw) return;
    if (!isValidPhone(raw)) {
      toast.error("Número inválido. Use DDD + número (ex: 16988083263).");
      return;
    }
    const norm = normalizePhone(raw);
    if (phones.includes(norm)) {
      toast.error("Este número já foi adicionado.");
      return;
    }
    if (phones.length >= MAX_PHONES) {
      toast.error(`Máximo ${MAX_PHONES} números por teste.`);
      return;
    }
    setPhones([...phones, norm]);
    setPhoneInput("");
  }

  function removePhone(p: string) {
    setPhones(phones.filter((x) => x !== p));
  }

  async function handleSend() {
    if (cost > creditsAvailable) {
      toast.error("Créditos insuficientes.");
      return;
    }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "campaign-create-manual",
        {
          body: {
            orgId,
            name: name.trim(),
            message_template: template.trim(),
            phones,
          },
        },
      );
      if (error) throw error;
      const res = data as {
        ok: boolean;
        error?: string;
        enqueued?: number;
        invalid_numbers?: number;
      };
      if (!res?.ok) {
        const map: Record<string, string> = {
          no_credits: "Sem créditos suficientes.",
          no_valid_phones:
            "Nenhum número válido (todos foram descartados pela validação).",
          forbidden: "Você não tem permissão nesta loja.",
          unauthorized: "Sessão expirada. Faça login novamente.",
          no_active_subscription: "Assinatura de campanhas inativa.",
        };
        toast.error(
          map[res?.error ?? ""] ?? "Não foi possível criar a campanha.",
        );
        return;
      }
      const parts = [`${res.enqueued ?? 0} enfileiradas`];
      if (res.invalid_numbers && res.invalid_numbers > 0) {
        parts.push(`${res.invalid_numbers} sem WhatsApp (descartadas)`);
      }
      toast.success(`Campanha criada! ${parts.join(" · ")}`);
      qc.invalidateQueries({ queryKey: ["campaigns", orgId] });
      qc.invalidateQueries({ queryKey: ["campaign_credits", orgId] });
      qc.invalidateQueries({ queryKey: ["daily_send_stats", orgId] });
      onOpenChange(false);
    } catch (e) {
      console.error("[campaign-real-test] error", e);
      toast.error("Não foi possível criar a campanha.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Campanha real (teste controlado)
          </DialogTitle>
          <DialogDescription>
            Dispara pra até {MAX_PHONES} números que você escolher, com o mesmo
            pipeline anti-ban (delay 4–10s, validação UazAPI). Custa{" "}
            <strong>1 crédito por número válido</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">
              Nome da campanha
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">
              Números (DDD + número, sem +55). Máx. {MAX_PHONES}.
            </label>
            <div className="flex gap-2">
              <Input
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addPhone();
                  }
                }}
                placeholder="Ex: 16988083263"
                inputMode="tel"
              />
              <Button
                type="button"
                variant="outline"
                onClick={addPhone}
                disabled={phones.length >= MAX_PHONES}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {phones.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {phones.map((p) => (
                  <span
                    key={p}
                    className="inline-flex items-center gap-1 text-xs bg-primary/10 border border-primary/30 rounded-full px-2 py-1 text-foreground"
                  >
                    {p}
                    <button
                      type="button"
                      onClick={() => removePhone(p)}
                      className="text-muted-foreground hover:text-foreground"
                      aria-label={`Remover ${p}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">
              Mensagem
            </label>
            <Textarea
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              rows={4}
              className="text-sm"
              maxLength={4000}
            />
          </div>

          <div>
            <div className="text-xs font-semibold text-foreground mb-1">
              Preview
            </div>
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3 text-sm whitespace-pre-wrap text-foreground">
              {preview}
            </div>
          </div>

          <div className="text-xs text-muted-foreground flex justify-between">
            <span>
              Custo: <strong className="text-foreground">{cost} crédito(s)</strong>
            </span>
            <span>
              Disponível:{" "}
              <strong className="text-foreground">{creditsAvailable}</strong>
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={sending}
          >
            Cancelar
          </Button>
          <Button onClick={handleSend} disabled={!canSend}>
            {sending ? (
              <>
                <Loader2 className="w-4 h-4 mr-1 animate-spin" /> Criando...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-1" /> Disparar ({cost} crédito
                {cost === 1 ? "" : "s"})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}