import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Copy, CheckCircle2, QrCode, Clock } from "lucide-react";
import TermsCheckbox from "./TermsCheckbox";

interface PixPaymentTabProps {
  orgId: string;
  plan: string;
  planPrice: string;
  billing?: "monthly" | "quarterly" | "annual";
  promo?: boolean;
  onSuccess: () => void;
  onClose: () => void;
}

const formatCpfCnpj = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  return digits
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
};

const PixPaymentTab = ({ orgId, plan, planPrice, billing = "monthly", promo, onSuccess, onClose }: PixPaymentTabProps) => {
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pixData, setPixData] = useState<{
    qrCode: string;
    qrCodeBase64: string;
    paymentId: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(600); // 10 min
  const [paid, setPaid] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const handleGeneratePix = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanDoc = cpfCnpj.replace(/\D/g, "");
    if (cleanDoc.length !== 11 && cleanDoc.length !== 14) {
      toast.error("Informe um CPF ou CNPJ válido");
      return;
    }

    setSubmitting(true);
    try {
      // Record terms acceptance
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) throw new Error("Sessão expirada. Faça login novamente.");

      let clientIp = "unknown";
      try {
        const { data: ipData } = await supabase.functions.invoke("get-client-ip");
        if (ipData?.ip) clientIp = ipData.ip;
      } catch {}

      await supabase.from("terms_acceptances" as any).insert({
        organization_id: orgId,
        user_id: session.user.id,
        ip_address: clientIp,
        user_agent: navigator.userAgent,
      });

      const { data, error } = await supabase.functions.invoke("create-mp-payment", {
        body: { org_id: orgId, plan, cpf_cnpj: cleanDoc, payment_method: "pix", billing, promo: !!promo },
      });

      if (error) {
        let realMsg = error.message;
        try {
          const ctx = (error as any).context;
          if (ctx?.json) {
            const body = await ctx.json();
            realMsg = body?.details || body?.error || realMsg;
          } else if (ctx?.text) {
            realMsg = (await ctx.text()) || realMsg;
          }
        } catch {}
        throw new Error(realMsg);
      }
      if (data?.error) throw new Error(data.details || data.error);

      if (!data.pix_qr_code) {
        throw new Error("QR Code PIX não gerado. Tente novamente.");
      }

      setPixData({
        qrCode: data.pix_qr_code,
        qrCodeBase64: data.pix_qr_code_base64,
        paymentId: data.payment_id,
      });

      // Start countdown
      setSecondsLeft(600);
      countdownRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            if (pollingRef.current) clearInterval(pollingRef.current);
            toast.error("PIX expirado. Gere um novo código.");
            setPixData(null);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Start polling
      pollingRef.current = setInterval(async () => {
        try {
          const { data: checkData } = await supabase.functions.invoke("check-subscription-pix", {
            body: { payment_id: data.payment_id, org_id: orgId, plan },
          });
          if (checkData?.paid) {
            if (pollingRef.current) clearInterval(pollingRef.current);
            if (countdownRef.current) clearInterval(countdownRef.current);
            setPaid(true);
            toast.success("Pagamento PIX confirmado! 🎉", { duration: 5000 });
            setTimeout(() => {
              onClose();
              onSuccess();
            }, 1500);
            return;
          }
          const st = checkData?.status;
          if (st === "rejected" || st === "cancelled" || st === "expired") {
            if (pollingRef.current) clearInterval(pollingRef.current);
            if (countdownRef.current) clearInterval(countdownRef.current);
            setPixData(null);
            toast.error(
              st === "expired"
                ? "PIX expirado. Gere um novo código."
                : "Pagamento recusado pelo Mercado Pago. Gere um novo PIX.",
            );
          }
        } catch {
          // silently retry
        }
      }, 5000);
    } catch (err: any) {
      console.error("[PixPaymentTab] Error:", err);
      toast.error("Erro ao gerar PIX", {
        description: err.message || "Tente novamente",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = async () => {
    if (!pixData?.qrCode) return;
    try {
      await navigator.clipboard.writeText(pixData.qrCode);
      setCopied(true);
      toast.success("Código PIX copiado!");
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  if (paid) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-3">
        <CheckCircle2 className="w-12 h-12 text-primary" />
        <p className="text-lg font-semibold">Pagamento confirmado!</p>
        <p className="text-sm text-muted-foreground">Seu plano foi ativado com sucesso.</p>
      </div>
    );
  }

  if (pixData) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          Expira em {formatTime(secondsLeft)}
        </div>

        <div className="flex justify-center">
          {pixData.qrCodeBase64 ? (
            <img
              src={`data:image/png;base64,${pixData.qrCodeBase64}`}
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
            <Input
              value={pixData.qrCode}
              readOnly
              className="text-xs font-mono"
            />
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
          <Loader2 className="w-4 h-4 animate-spin" />
          Aguardando pagamento...
        </div>

        <p className="text-xs text-center text-muted-foreground">
          O pagamento via PIX ativa o plano por {billing === "annual" ? "12 meses" : billing === "quarterly" ? "90 dias" : "30 dias"}. Será necessário renovar manualmente.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleGeneratePix} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="pix-cpf">CPF ou CNPJ</Label>
        <Input
          id="pix-cpf"
          placeholder="000.000.000-00"
          value={cpfCnpj}
          onChange={(e) => setCpfCnpj(formatCpfCnpj(e.target.value))}
          maxLength={18}
          inputMode="numeric"
          disabled={submitting}
        />
      </div>

      <TermsCheckbox
        checked={termsAccepted}
        onCheckedChange={setTermsAccepted}
        disabled={submitting}
      />

      <Button type="submit" className="w-full" size="lg" disabled={submitting || !termsAccepted}>
        {submitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Gerando PIX...
          </>
        ) : (
          `Pagar ${planPrice} via PIX`
        )}
      </Button>

      <p className="text-xs text-center text-muted-foreground">
        O pagamento via PIX ativa o plano por {billing === "annual" ? "12 meses" : billing === "quarterly" ? "90 dias" : "30 dias"}. Será necessário renovar manualmente.
      </p>
    </form>
  );
};

export default PixPaymentTab;
