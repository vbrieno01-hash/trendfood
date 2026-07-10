import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, QrCode, Copy, CheckCircle2, Clock, Megaphone } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  orgId: string;
  onSuccess?: () => void;
}

const PRICE_LABEL = "R$ 19,90";

const formatCpfCnpj = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 14);
  if (d.length <= 11) {
    return d
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  return d
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
};

export default function CampaignPixDialog({ open, onOpenChange, orgId, onSuccess }: Props) {
  const qc = useQueryClient();
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pix, setPix] = useState<{ qr: string; qrBase64: string | null; paymentId: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(600);
  const [paid, setPaid] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const clearTimers = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    pollRef.current = null;
    countdownRef.current = null;
  };

  const teardownRealtime = () => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  };

  const markPaid = () => {
    clearTimers();
    teardownRealtime();
    setPaid(true);
    toast.success("Pagamento confirmado! 250 mensagens liberadas por 30 dias.");
    qc.invalidateQueries({ queryKey: ["campaign_credits", orgId] });
    setTimeout(() => {
      onSuccess?.();
      onOpenChange(false);
    }, 1800);
  };

  // Cleanup on close
  useEffect(() => {
    if (open) return;
    setCpfCnpj("");
    setPix(null);
    setPaid(false);
    setCopied(false);
    clearTimers();
    teardownRealtime();
  }, [open]);

  useEffect(() => () => {
    clearTimers();
    teardownRealtime();
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = cpfCnpj.replace(/\D/g, "");
    if (clean.length !== 11 && clean.length !== 14) {
      toast.error("Informe um CPF ou CNPJ válido");
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-campaign-pix", {
        body: { org_id: orgId, cpf_cnpj: clean },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.details || data.error);
      if (!data?.pix_qr_code) throw new Error("QR Code PIX não gerado.");

      const paymentId = String(data.payment_id);
      setPix({ qr: data.pix_qr_code, qrBase64: data.pix_qr_code_base64, paymentId });
      setSecondsLeft(600);

      // Countdown
      countdownRef.current = setInterval(() => {
        setSecondsLeft((p) => {
          if (p <= 1) {
            clearTimers();
            teardownRealtime();
            toast.error("PIX expirado. Gere um novo.");
            setPix(null);
            return 0;
          }
          return p - 1;
        });
      }, 1000);

      // Realtime — quando o webhook chamar o RPC, a linha em campaign_credits muda
      channelRef.current = supabase
        .channel(`campaign_credits:${orgId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "campaign_credits",
            filter: `organization_id=eq.${orgId}`,
          },
          () => {
            markPaid();
          }
        )
        .subscribe();

      // Fallback: polling MP direto a cada 5s
      pollRef.current = setInterval(async () => {
        try {
          const { data: chk } = await supabase.functions.invoke("check-addon-pix", {
            body: { org_id: orgId, payment_id: paymentId },
          });
          if (chk?.paid) {
            markPaid();
            return;
          }
          const st = chk?.status;
          if (st === "rejected" || st === "cancelled" || st === "expired") {
            clearTimers();
            teardownRealtime();
            setPix(null);
            toast.error(
              st === "expired"
                ? "PIX expirado. Gere um novo."
                : "Pagamento recusado pelo Mercado Pago. Gere um novo PIX.",
            );
          }
        } catch { /* retry */ }
      }, 5000);
    } catch (err: any) {
      console.error("[CampaignPixDialog] pix err:", err);
      toast.error(err.message || "Erro ao gerar PIX");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = async () => {
    if (!pix) return;
    try {
      await navigator.clipboard.writeText(pix.qr);
      setCopied(true);
      toast.success("Código PIX copiado!");
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!submitting) onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-md w-[calc(100vw-1rem)] max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-primary" /> Campanhas WhatsApp
          </DialogTitle>
          <DialogDescription>
            {PRICE_LABEL} · 250 mensagens · válido por 30 dias. Pagamento único no PIX — sem cobrança automática.
          </DialogDescription>
        </DialogHeader>

        <div className="pt-2">
          {paid ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <CheckCircle2 className="w-12 h-12 text-primary" />
              <p className="text-lg font-semibold">Pagamento confirmado!</p>
              <p className="text-sm text-muted-foreground">250 mensagens liberadas por 30 dias.</p>
            </div>
          ) : pix ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" /> Expira em {fmtTime(secondsLeft)}
              </div>
              <div className="flex justify-center">
                {pix.qrBase64 ? (
                  <img
                    src={`data:image/png;base64,${pix.qrBase64}`}
                    alt="QR Code PIX"
                    className="w-48 h-48 rounded-lg border"
                  />
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center border rounded-lg bg-muted">
                    <QrCode className="w-16 h-16 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Copia e Cola</Label>
                <div className="flex gap-2">
                  <Input value={pix.qr} readOnly className="text-xs font-mono" />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleCopy}
                    className="shrink-0"
                  >
                    {copied ? <CheckCircle2 className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Aguardando pagamento...
              </div>
              <p className="text-xs text-center text-muted-foreground">
                Assim que a gente detectar o PIX, seus créditos entram automaticamente.
              </p>
            </div>
          ) : (
            <form onSubmit={handleGenerate} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="camp-pix-doc">CPF ou CNPJ</Label>
                <Input
                  id="camp-pix-doc"
                  placeholder="000.000.000-00"
                  value={cpfCnpj}
                  onChange={(e) => setCpfCnpj(formatCpfCnpj(e.target.value))}
                  maxLength={18}
                  inputMode="numeric"
                  disabled={submitting}
                />
                <p className="text-xs text-muted-foreground">
                  Precisamos do documento pra o Mercado Pago gerar o PIX.
                </p>
              </div>
              <Button type="submit" className="w-full" size="lg" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" /> Gerando PIX...
                  </>
                ) : (
                  `Gerar PIX de ${PRICE_LABEL}`
                )}
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Pagou → liberou. Sem cartão salvo, sem renovação automática.
              </p>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}