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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, CreditCard, Lock, QrCode, Copy, CheckCircle2, Clock, Bot } from "lucide-react";
import logoIcon from "@/assets/logo-icon.png";
import { getMpErrorMessage } from "@/components/checkout/mpErrorMessages";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  orgId: string;
  onSuccess?: () => void;
}

const ADDON_PRICE_LABEL = "R$ 50,00";

const formatCardNumber = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 16);
  return d.replace(/(\d{4})(?=\d)/g, "$1 ");
};
const formatCpf = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
};
const formatCpfCnpj = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 14);
  if (d.length <= 11) return formatCpf(v);
  return d
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
};

export default function AiBotAddonCheckoutDialog({ open, onOpenChange, orgId, onSuccess }: Props) {
  const qc = useQueryClient();

  // ── MP SDK ──
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [sdkReady, setSdkReady] = useState(false);
  const mpRef = useRef<any>(null);

  // ── Card ──
  const [cardNumber, setCardNumber] = useState("");
  const [cardholderName, setCardholderName] = useState("");
  const [expMonth, setExpMonth] = useState("");
  const [expYear, setExpYear] = useState("");
  const [cvv, setCvv] = useState("");
  const [cardCpf, setCardCpf] = useState("");
  const [submittingCard, setSubmittingCard] = useState(false);

  // ── PIX ──
  const [pixCpfCnpj, setPixCpfCnpj] = useState("");
  const [submittingPix, setSubmittingPix] = useState(false);
  const [pixData, setPixData] = useState<{ qr: string; qrBase64: string | null; paymentId: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(600);
  const [paid, setPaid] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load public key when dialog opens
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.functions.invoke("get-mp-public-key");
      if (cancelled) return;
      if (!data?.public_key) {
        toast.error("Não foi possível carregar o pagamento. Tente novamente.");
        return;
      }
      setPublicKey(data.public_key);
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  // Init MP SDK
  useEffect(() => {
    if (!publicKey) return;
    const boot = () => {
      try {
        mpRef.current = new (window as any).MercadoPago(publicKey, { locale: "pt-BR" });
        setSdkReady(true);
      } catch (e) {
        console.error("[AiBotAddonCheckoutDialog] SDK init err:", e);
      }
    };
    if (document.getElementById("mp-sdk-v2")) {
      boot();
      return;
    }
    const s = document.createElement("script");
    s.id = "mp-sdk-v2";
    s.src = "https://sdk.mercadopago.com/js/v2";
    s.async = true;
    s.onload = boot;
    document.head.appendChild(s);
  }, [publicKey]);

  // Cleanup on close
  useEffect(() => {
    if (open) return;
    setCardNumber("");
    setCardholderName("");
    setExpMonth("");
    setExpYear("");
    setCvv("");
    setCardCpf("");
    setPixCpfCnpj("");
    setPixData(null);
    setPaid(false);
    setCopied(false);
    if (pollRef.current) clearInterval(pollRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
  }, [open]);

  const handleCardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mpRef.current) {
      toast.error("SDK ainda carregando. Aguarde.");
      return;
    }
    const cleanCard = cardNumber.replace(/\s/g, "");
    const cleanCpf = cardCpf.replace(/\D/g, "");
    if (cleanCard.length < 13 || !cardholderName || !expMonth || !expYear || !cvv || cleanCpf.length !== 11) {
      toast.error("Preencha todos os campos corretamente");
      return;
    }
    setSubmittingCard(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) throw new Error("Sessão expirada. Faça login novamente.");

      const tokenResult = await mpRef.current.createCardToken({
        cardNumber: cleanCard,
        cardholderName,
        cardExpirationMonth: expMonth.padStart(2, "0"),
        cardExpirationYear: expYear.length === 2 ? `20${expYear}` : expYear,
        securityCode: cvv,
        identificationType: "CPF",
        identificationNumber: cleanCpf,
      });
      if (!tokenResult?.id) throw new Error("Não foi possível tokenizar o cartão");

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-addon-subscription`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sess.session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ org_id: orgId, addon_key: "ai_bot", card_token_id: tokenResult.id }),
        }
      );
      const json = await res.json();
      if (!res.ok || json?.error) {
        throw new Error(getMpErrorMessage(json?.status_detail || json?.message || json?.error));
      }
      toast.success("Robô WhatsApp ativado! Cobrança automática configurada.", { duration: 5000 });
      qc.invalidateQueries({ queryKey: ["org-addon", orgId, "ai_bot"] });
      onSuccess?.();
      onOpenChange(false);
    } catch (err: any) {
      console.error("[AiBotAddonCheckoutDialog] card err:", err);
      toast.error(err.message || "Pagamento recusado. Verifique os dados.");
    } finally {
      setSubmittingCard(false);
    }
  };

  const handleGeneratePix = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = pixCpfCnpj.replace(/\D/g, "");
    if (clean.length !== 11 && clean.length !== 14) {
      toast.error("Informe um CPF ou CNPJ válido");
      return;
    }
    setSubmittingPix(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-addon-pix", {
        body: { org_id: orgId, addon_key: "ai_bot", cpf_cnpj: clean },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.details || data.error);
      if (!data?.pix_qr_code) throw new Error("QR Code PIX não gerado.");

      setPixData({ qr: data.pix_qr_code, qrBase64: data.pix_qr_code_base64, paymentId: String(data.payment_id) });
      setSecondsLeft(600);

      countdownRef.current = setInterval(() => {
        setSecondsLeft((p) => {
          if (p <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            if (pollRef.current) clearInterval(pollRef.current);
            toast.error("PIX expirado. Gere um novo.");
            setPixData(null);
            return 0;
          }
          return p - 1;
        });
      }, 1000);

      pollRef.current = setInterval(async () => {
        try {
          const { data: chk } = await supabase.functions.invoke("check-addon-pix", {
            body: { org_id: orgId, payment_id: String(data.payment_id) },
          });
          if (chk?.paid) {
            if (pollRef.current) clearInterval(pollRef.current);
            if (countdownRef.current) clearInterval(countdownRef.current);
            setPaid(true);
            toast.success("Pagamento confirmado! Robô ativado por 30 dias.");
            qc.invalidateQueries({ queryKey: ["org-addon", orgId, "ai_bot"] });
            setTimeout(() => {
              onSuccess?.();
              onOpenChange(false);
            }, 1500);
            return;
          }
          const st = chk?.status;
          if (st === "rejected" || st === "cancelled" || st === "expired") {
            if (pollRef.current) clearInterval(pollRef.current);
            if (countdownRef.current) clearInterval(countdownRef.current);
            setPixData(null);
            toast.error(
              st === "expired"
                ? "PIX expirado. Gere um novo."
                : "Pagamento recusado pelo Mercado Pago. Gere um novo PIX.",
            );
          }
        } catch { /* retry */ }
      }, 5000);
    } catch (err: any) {
      console.error("[AiBotAddonCheckoutDialog] pix err:", err);
      toast.error(err.message || "Erro ao gerar PIX");
    } finally {
      setSubmittingPix(false);
    }
  };

  const handleCopy = async () => {
    if (!pixData) return;
    try {
      await navigator.clipboard.writeText(pixData.qr);
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
        if (!submittingCard && !submittingPix) onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-md w-[calc(100vw-1rem)] max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <img src={logoIcon} alt="TrendFood" className="w-7 h-7 rounded-lg object-contain" />
            <DialogTitle className="text-xl flex items-center gap-2">
              <Bot className="w-5 h-5 text-primary" /> Ativar Robô WhatsApp
            </DialogTitle>
          </div>
          <DialogDescription>
            {ADDON_PRICE_LABEL}/mês — cobrança recorrente no cartão (todo dia 4) ou PIX avulso (renova 30 dias).
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="card" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="card" className="gap-1.5">
              <CreditCard className="w-4 h-4" /> Cartão
            </TabsTrigger>
            <TabsTrigger value="pix" className="gap-1.5">
              <QrCode className="w-4 h-4" /> PIX
            </TabsTrigger>
          </TabsList>

          <TabsContent value="card">
            {!sdkReady ? (
              <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin" /> Carregando formulário...
              </div>
            ) : (
              <form onSubmit={handleCardSubmit} className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="ab-card">Número do cartão</Label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="ab-card"
                      placeholder="0000 0000 0000 0000"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                      className="pl-10"
                      maxLength={19}
                      inputMode="numeric"
                      disabled={submittingCard}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ab-name">Nome no cartão</Label>
                  <Input
                    id="ab-name"
                    placeholder="NOME COMO NO CARTÃO"
                    value={cardholderName}
                    onChange={(e) => setCardholderName(e.target.value.toUpperCase())}
                    disabled={submittingCard}
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="ab-mm">Mês</Label>
                    <Input
                      id="ab-mm"
                      placeholder="MM"
                      value={expMonth}
                      onChange={(e) => setExpMonth(e.target.value.replace(/\D/g, "").slice(0, 2))}
                      maxLength={2}
                      inputMode="numeric"
                      disabled={submittingCard}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ab-yy">Ano</Label>
                    <Input
                      id="ab-yy"
                      placeholder="AA"
                      value={expYear}
                      onChange={(e) => setExpYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      maxLength={4}
                      inputMode="numeric"
                      disabled={submittingCard}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ab-cvv">CVV</Label>
                    <Input
                      id="ab-cvv"
                      placeholder="123"
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      maxLength={4}
                      inputMode="numeric"
                      disabled={submittingCard}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ab-cpf">CPF do titular</Label>
                  <Input
                    id="ab-cpf"
                    placeholder="000.000.000-00"
                    value={cardCpf}
                    onChange={(e) => setCardCpf(formatCpf(e.target.value))}
                    maxLength={14}
                    inputMode="numeric"
                    disabled={submittingCard}
                  />
                </div>
                <Button type="submit" className="w-full" size="lg" disabled={submittingCard}>
                  {submittingCard ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" /> Processando...
                    </>
                  ) : (
                    `Ativar por ${ADDON_PRICE_LABEL}/mês`
                  )}
                </Button>
                <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                  <Lock className="w-3 h-3" /> Pagamento seguro · Cobrança recorrente todo dia 4
                </div>
              </form>
            )}
          </TabsContent>

          <TabsContent value="pix">
            <div className="pt-2">
              {paid ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <CheckCircle2 className="w-12 h-12 text-primary" />
                  <p className="text-lg font-semibold">Pagamento confirmado!</p>
                  <p className="text-sm text-muted-foreground">Robô ativado por 30 dias.</p>
                </div>
              ) : pixData ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" /> Expira em {fmtTime(secondsLeft)}
                  </div>
                  <div className="flex justify-center">
                    {pixData.qrBase64 ? (
                      <img
                        src={`data:image/png;base64,${pixData.qrBase64}`}
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
                      <Input value={pixData.qr} readOnly className="text-xs font-mono" />
                      <Button type="button" variant="outline" size="icon" onClick={handleCopy} className="shrink-0">
                        {copied ? <CheckCircle2 className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" /> Aguardando pagamento...
                  </div>
                  <p className="text-xs text-center text-muted-foreground">
                    O PIX ativa o robô por 30 dias. Será necessário renovar manualmente no próximo mês.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleGeneratePix} className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor="ab-pix-cpf">CPF ou CNPJ</Label>
                    <Input
                      id="ab-pix-cpf"
                      placeholder="000.000.000-00"
                      value={pixCpfCnpj}
                      onChange={(e) => setPixCpfCnpj(formatCpfCnpj(e.target.value))}
                      maxLength={18}
                      inputMode="numeric"
                      disabled={submittingPix}
                    />
                  </div>
                  <Button type="submit" className="w-full" size="lg" disabled={submittingPix}>
                    {submittingPix ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" /> Gerando PIX...
                      </>
                    ) : (
                      `Pagar ${ADDON_PRICE_LABEL} via PIX`
                    )}
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">
                    O PIX ativa o robô por 30 dias. Será necessário renovar manualmente no próximo mês.
                  </p>
                </form>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}