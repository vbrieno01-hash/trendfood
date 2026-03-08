import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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
import { Loader2, CreditCard, Lock, QrCode } from "lucide-react";
import logoIcon from "@/assets/logo-icon.png";
import { getMpErrorMessage } from "./mpErrorMessages";
import PixPaymentTab from "./PixPaymentTab";
import TermsCheckbox from "./TermsCheckbox";

interface CardPaymentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  plan: string;
  planName: string;
  planPrice: string;
  billing?: "monthly" | "annual";
  onSuccess: () => void;
}

const CardPaymentForm = ({
  open,
  onOpenChange,
  orgId,
  plan,
  planName,
  planPrice,
  billing = "monthly",
  onSuccess,
}: CardPaymentFormProps) => {
  const [sdkReady, setSdkReady] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const mpRef = useRef<MercadoPagoInstance | null>(null);

  const [cardNumber, setCardNumber] = useState("");
  const [cardholderName, setCardholderName] = useState("");
  const [expirationMonth, setExpirationMonth] = useState("");
  const [expirationYear, setExpirationYear] = useState("");
  const [securityCode, setSecurityCode] = useState("");
  const [identificationNumber, setIdentificationNumber] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);

  useEffect(() => {
    if (!open) return;

    const fetchPublicKey = async () => {
      // Verify session before calling edge function
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) {
        // Try refreshing
        const { data: refreshed } = await supabase.auth.refreshSession();
        if (!refreshed?.session) {
          toast.error("Sessão expirada. Faça login novamente.");
          return;
        }
      }

      const invoke = () => supabase.functions.invoke("get-mp-public-key");
      let { data, error } = await invoke();

      // Retry once on failure
      if (error) {
        console.warn("[CardPaymentForm] get-mp-public-key retry after error:", error);
        ({ data, error } = await invoke());
      }

      if (error) {
        console.error("[CardPaymentForm] get-mp-public-key error:", error);
        toast.error("Erro ao carregar pagamento. Tente recarregar a página.");
        return;
      }
      if (!data?.public_key) {
        console.error("[CardPaymentForm] public_key ausente na resposta:", data);
        toast.error("Configuração de pagamento indisponível. Tente novamente.");
        return;
      }
      setPublicKey(data.public_key);
    };

    fetchPublicKey();
  }, [open]);

  useEffect(() => {
    if (!publicKey) return;
    const existingScript = document.getElementById("mp-sdk-v2");
    if (existingScript) {
      try {
        mpRef.current = new window.MercadoPago(publicKey, { locale: "pt-BR" });
        setSdkReady(true);
      } catch { /* SDK not ready yet */ }
      return;
    }
    const script = document.createElement("script");
    script.id = "mp-sdk-v2";
    script.src = "https://sdk.mercadopago.com/js/v2";
    script.async = true;
    script.onload = () => {
      try {
        mpRef.current = new window.MercadoPago(publicKey, { locale: "pt-BR" });
        setSdkReady(true);
      } catch (e) {
        console.error("[CardPaymentForm] SDK init error:", e);
      }
    };
    document.head.appendChild(script);
  }, [publicKey]);

  const formatCardNumber = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
  };

  const formatCpf = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    return digits
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mpRef.current) {
      toast.error("SDK de pagamento não carregado. Aguarde.");
      return;
    }

    const cleanCard = cardNumber.replace(/\s/g, "");
    const cleanCpf = identificationNumber.replace(/\D/g, "");

    if (cleanCard.length < 13 || !cardholderName || !expirationMonth || !expirationYear || !securityCode || cleanCpf.length !== 11) {
      toast.error("Preencha todos os campos corretamente");
      return;
    }

    setSubmitting(true);
    try {
      // Record terms acceptance
      const session = (await supabase.auth.getSession()).data.session;
      if (!session?.access_token) throw new Error("Sessão expirada. Faça login novamente.");

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

      const tokenResult = await mpRef.current.createCardToken({
        cardNumber: cleanCard,
        cardholderName,
        cardExpirationMonth: expirationMonth.padStart(2, "0"),
        cardExpirationYear: expirationYear.length === 2 ? `20${expirationYear}` : expirationYear,
        securityCode,
        identificationType: "CPF",
        identificationNumber: cleanCpf,
      });

      if (!tokenResult?.id) throw new Error("Não foi possível tokenizar o cartão");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-mp-subscription`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ org_id: orgId, plan, card_token_id: tokenResult.id, billing }),
        }
      );

      const data = await response.json();
      console.log("[CardPaymentForm] create-mp-subscription response:", response.status, data);

      if (!response.ok || data?.error) {
        const errorMsg = getMpErrorMessage(data?.status_detail || data?.message || data?.error);
        throw new Error(errorMsg);
      }


      toast.success("Assinatura ativada com sucesso! 🎉", { duration: 5000 });
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      console.error("[CardPaymentForm] Error:", err);
      const message = err.message || "Pagamento recusado. Verifique os dados e tente novamente.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setCardNumber("");
    setCardholderName("");
    setExpirationMonth("");
    setExpirationYear("");
    setSecurityCode("");
    setIdentificationNumber("");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!submitting) {
          onOpenChange(v);
          if (!v) resetForm();
        }
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <img src={logoIcon} alt="TrendFood" className="w-7 h-7 rounded-lg object-contain" />
            <DialogTitle className="text-xl">Assinar {planName}</DialogTitle>
          </div>
          <DialogDescription>
            {planPrice}{billing === "annual" ? "/ano" : "/mês"} — escolha a forma de pagamento.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="card" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="card" className="gap-1.5">
              <CreditCard className="w-4 h-4" />
              Cartão
            </TabsTrigger>
            <TabsTrigger value="pix" className="gap-1.5">
              <QrCode className="w-4 h-4" />
              PIX
            </TabsTrigger>
          </TabsList>

          <TabsContent value="card">
            {!sdkReady ? (
              <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin" />
                Carregando formulário...
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="cardNumber">Número do cartão</Label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="cardNumber"
                      placeholder="0000 0000 0000 0000"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                      className="pl-10"
                      maxLength={19}
                      inputMode="numeric"
                      disabled={submitting}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cardholderName">Nome no cartão</Label>
                  <Input
                    id="cardholderName"
                    placeholder="NOME COMO NO CARTÃO"
                    value={cardholderName}
                    onChange={(e) => setCardholderName(e.target.value.toUpperCase())}
                    disabled={submitting}
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="expirationMonth">Mês</Label>
                    <Input
                      id="expirationMonth"
                      placeholder="MM"
                      value={expirationMonth}
                      onChange={(e) => setExpirationMonth(e.target.value.replace(/\D/g, "").slice(0, 2))}
                      maxLength={2}
                      inputMode="numeric"
                      disabled={submitting}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expirationYear">Ano</Label>
                    <Input
                      id="expirationYear"
                      placeholder="AA"
                      value={expirationYear}
                      onChange={(e) => setExpirationYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      maxLength={4}
                      inputMode="numeric"
                      disabled={submitting}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="securityCode">CVV</Label>
                    <Input
                      id="securityCode"
                      placeholder="123"
                      value={securityCode}
                      onChange={(e) => setSecurityCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      maxLength={4}
                      inputMode="numeric"
                      disabled={submitting}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cpf">CPF do titular</Label>
                  <Input
                    id="cpf"
                    placeholder="000.000.000-00"
                    value={identificationNumber}
                    onChange={(e) => setIdentificationNumber(formatCpf(e.target.value))}
                    maxLength={14}
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
                      Processando...
                    </>
                  ) : (
                    `Assinar por ${planPrice}${billing === "annual" ? "/ano" : "/mês"}`
                  )}
                </Button>

                <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                  <Lock className="w-3 h-3" />
                  Pagamento seguro • Cobrança recorrente
                </div>
              </form>
            )}
          </TabsContent>

          <TabsContent value="pix">
            <div className="pt-2">
              <PixPaymentTab
                orgId={orgId}
                plan={plan}
                planPrice={planPrice}
                onSuccess={onSuccess}
                onClose={() => onOpenChange(false)}
              />
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default CardPaymentForm;
