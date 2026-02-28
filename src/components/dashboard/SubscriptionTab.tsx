import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import PlanCard from "@/components/pricing/PlanCard";
import { QrCode, CreditCard, Loader2, Copy, CheckCircle, ArrowLeft, Store } from "lucide-react";

const PLANS = [
  {
    key: "free",
    name: "Grátis",
    price: "Grátis",
    description: "Para começar a vender online",
    features: [
      "Cardápio digital ilimitado",
      "Até 5 itens no cardápio",
      "Até 3 mesas",
      "Pedidos via QR Code",
      "Suporte por chat",
    ],
    cta: "Plano atual",
    ctaLink: "#",
    priceCents: 0,
  },
  {
    key: "pro",
    name: "Pro",
    price: "R$ 99",
    description: "Para restaurantes em crescimento",
    features: [
      "Itens ilimitados no cardápio",
      "Mesas ilimitadas",
      "Painel Cozinha (KDS)",
      "Painel do Garçom",
      "Cupons de desconto",
      "Mais vendidos",
      "Controle de caixa",
      "Impressão automática",
    ],
    cta: "Assinar Pro",
    ctaLink: "#",
    highlighted: true,
    badge: "Mais popular",
    priceCents: 9900,
  },
  {
    key: "enterprise",
    name: "Enterprise",
    price: "R$ 249",
    description: "Para operações completas",
    features: [
      "Tudo do Pro",
      "Relatórios avançados",
      "Robô de WhatsApp",
      "Multi-unidades",
      "Motoboys integrados",
      "Suporte prioritário",
    ],
    cta: "Assinar Enterprise",
    ctaLink: "#",
    priceCents: 24900,
  },
];

const formatCpfCnpj = (value: string) => {
  const digits = value.replace(/\D/g, "");
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

const formatCardNumber = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
};

const formatExpiry = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length >= 3) {
    return digits.slice(0, 2) + "/" + digits.slice(2);
  }
  return digits;
};

const SubscriptionTab = () => {
  const { organization, session } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "card">("pix");
  const [loading, setLoading] = useState(false);
  const [pixData, setPixData] = useState<{
    qr_code: string;
    qr_code_base64: string;
    payment_id: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Card fields
  const [cardNumber, setCardNumber] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");

  const currentPlan = organization?.subscription_plan || "free";

  const handleSelectPlan = (planKey: string) => {
    if (planKey === currentPlan || planKey === "free") return;
    setSelectedPlan(planKey);
    setPixData(null);
    setCopied(false);
  };

  const handleBack = () => {
    setSelectedPlan(null);
    setPixData(null);
    setCopied(false);
    setCpfCnpj("");
    setCardNumber("");
    setCardHolder("");
    setCardExpiry("");
    setCardCvv("");
  };

  const handleCopyPix = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success("Código PIX copiado!");
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  const createCardToken = async (): Promise<string | null> => {
    try {
      // Fetch public key from edge function
      const { data: keyData, error: keyError } = await supabase.functions.invoke("get-mp-public-key");
      if (keyError || !keyData?.public_key) {
        toast.error("Erro ao obter chave do gateway de pagamento");
        return null;
      }

      if (!window.MercadoPago) {
        toast.error("SDK de pagamento não carregado. Recarregue a página.");
        return null;
      }

      const mp = new window.MercadoPago(keyData.public_key, { locale: "pt-BR" });

      const cleanDoc = cpfCnpj.replace(/\D/g, "");
      const expiryParts = cardExpiry.split("/");
      if (expiryParts.length !== 2) {
        toast.error("Data de validade inválida (MM/AA)");
        return null;
      }

      const token = await mp.createCardToken({
        cardNumber: cardNumber.replace(/\s/g, ""),
        cardholderName: cardHolder,
        cardExpirationMonth: expiryParts[0],
        cardExpirationYear: "20" + expiryParts[1],
        securityCode: cardCvv,
        identificationType: cleanDoc.length <= 11 ? "CPF" : "CNPJ",
        identificationNumber: cleanDoc,
      });

      return token.id;
    } catch (err: any) {
      console.error("[SubscriptionTab] Card token error:", err);
      toast.error("Erro ao processar dados do cartão", {
        description: err.message || "Verifique os dados e tente novamente",
      });
      return null;
    }
  };

  const handleSubmitPayment = async () => {
    if (!organization || !session || !selectedPlan) return;

    const cleanDoc = cpfCnpj.replace(/\D/g, "");
    if (cleanDoc.length !== 11 && cleanDoc.length !== 14) {
      toast.error("CPF ou CNPJ inválido");
      return;
    }

    if (paymentMethod === "card") {
      if (!cardNumber.replace(/\s/g, "") || !cardHolder || !cardExpiry || !cardCvv) {
        toast.error("Preencha todos os campos do cartão");
        return;
      }
    }

    setLoading(true);
    try {
      let cardToken: string | undefined;

      if (paymentMethod === "card") {
        const token = await createCardToken();
        if (!token) {
          setLoading(false);
          return;
        }
        cardToken = token;
      }

      const { data, error } = await supabase.functions.invoke("create-mp-payment", {
        body: {
          org_id: organization.id,
          plan: selectedPlan,
          cpf_cnpj: cleanDoc,
          payment_method: paymentMethod,
          ...(cardToken ? { card_token: cardToken } : {}),
        },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.details || data.error);

      if (data.status === "approved") {
        toast.success("Pagamento aprovado! Seu plano foi atualizado 🎉");
        handleBack();
        return;
      }

      if (data.status === "in_process") {
        toast.info("Pagamento em análise. Você será notificado quando for confirmado.");
        return;
      }

      if (data.status === "rejected") {
        const detail = data.status_detail || "";
        const rejectionMessages: Record<string, string> = {
          cc_rejected_insufficient_amount: "Saldo insuficiente no cartão",
          cc_rejected_bad_filled_security_code: "CVV incorreto. Verifique o código de segurança",
          cc_rejected_bad_filled_date: "Data de validade incorreta",
          cc_rejected_bad_filled_card_number: "Número do cartão incorreto",
          cc_rejected_high_risk: "Pagamento recusado por análise de segurança",
          cc_rejected_blacklist: "Cartão não permitido. Tente outro cartão",
          cc_rejected_call_for_authorize: "Ligue para a operadora do cartão para autorizar",
          cc_rejected_card_disabled: "Cartão desabilitado. Contate a operadora",
          cc_rejected_duplicated_payment: "Pagamento duplicado. Já existe uma cobrança recente",
          cc_rejected_max_attempts: "Número máximo de tentativas atingido. Tente outro cartão",
          cc_rejected_card_type_not_allowed: "Tipo de cartão não aceito",
          cc_rejected_other_reason: "Cartão recusado. Tente outro cartão ou método de pagamento",
        };
        const friendlyMessage = rejectionMessages[detail] || "Pagamento recusado. Tente outro cartão ou método de pagamento";
        toast.error("Pagamento recusado", { description: friendlyMessage });
        return;
      }

      if (paymentMethod === "pix" && data.pix_qr_code) {
        setPixData({
          qr_code: data.pix_qr_code,
          qr_code_base64: data.pix_qr_code_base64,
          payment_id: data.payment_id,
        });
        toast.success("QR Code PIX gerado! Escaneie para pagar.");
      } else {
        toast.info(`Status do pagamento: ${data.status}`);
      }
    } catch (err: any) {
      console.error("[SubscriptionTab] Payment error:", err);
      toast.error("Erro ao processar pagamento", {
        description: err.message || "Tente novamente",
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedPlanData = PLANS.find((p) => p.key === selectedPlan);

  // PIX polling
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [pixPaid, setPixPaid] = useState(false);

  useEffect(() => {
    if (!pixData || !organization || !selectedPlan || pixPaid) {
      return;
    }

    const check = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("check-subscription-pix", {
          body: {
            payment_id: pixData.payment_id,
            org_id: organization.id,
            plan: selectedPlan,
          },
        });
        if (!error && data?.paid) {
          setPixPaid(true);
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
          toast.success("Pagamento confirmado! Seu plano foi ativado 🎉");
          setTimeout(() => {
            handleBack();
            window.location.reload();
          }, 1500);
        }
      } catch {
        // retry on next interval
      }
    };

    check();
    pollingRef.current = setInterval(check, 10000);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [pixData, organization, selectedPlan, pixPaid]);

  // PIX screen
  if (pixData && selectedPlanData) {
    return (
      <div className="max-w-md mx-auto space-y-6">
        <Button variant="ghost" size="sm" onClick={handleBack} className="gap-1.5">
          <ArrowLeft className="w-4 h-4" /> Voltar aos planos
        </Button>

        <div className="bg-card border border-border rounded-2xl p-6 text-center space-y-4">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-3 py-1 text-sm font-medium">
            <QrCode className="w-4 h-4" />
            PIX - {selectedPlanData.name}
          </div>

          <p className="text-2xl font-bold text-foreground">{selectedPlanData.price}/mês</p>
          <p className="text-sm text-muted-foreground">
            Assinando para: <span className="font-medium text-foreground">{organization?.name}</span>
          </p>

          {pixData.qr_code_base64 && (
            <div className="flex justify-center">
              <img
                src={`data:image/png;base64,${pixData.qr_code_base64}`}
                alt="QR Code PIX"
                className="w-56 h-56 rounded-xl border border-border"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Código PIX (copia e cola)</Label>
            <div className="flex gap-2">
              <Input
                value={pixData.qr_code}
                readOnly
                className="text-xs font-mono"
              />
              <Button
                size="icon"
                variant="outline"
                onClick={() => handleCopyPix(pixData.qr_code)}
              >
                {copied ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* Polling status indicator */}
          {!pixPaid && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground pt-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Aguardando pagamento...
            </div>
          )}
          {pixPaid && (
            <div className="flex items-center justify-center gap-2 text-sm text-primary font-medium pt-2">
              <CheckCircle className="w-4 h-4" />
              Pagamento confirmado!
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Após o pagamento, seu plano será ativado automaticamente em alguns segundos.
          </p>
        </div>
      </div>
    );
  }

  // Checkout form
  if (selectedPlan && selectedPlanData) {
    return (
      <div className="max-w-md mx-auto space-y-6">
        <Button variant="ghost" size="sm" onClick={handleBack} className="gap-1.5">
          <ArrowLeft className="w-4 h-4" /> Voltar aos planos
        </Button>

        <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
          <div className="text-center space-y-2">
            <Badge variant="secondary" className="gap-1.5">
              <Store className="w-3 h-3" />
              Assinando para: {organization?.name}
            </Badge>
            <h2 className="text-xl font-bold text-foreground">
              Plano {selectedPlanData.name} — {selectedPlanData.price}/mês
            </h2>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cpf_cnpj">CPF ou CNPJ</Label>
              <Input
                id="cpf_cnpj"
                placeholder="000.000.000-00"
                value={cpfCnpj}
                onChange={(e) => setCpfCnpj(formatCpfCnpj(e.target.value))}
                maxLength={18}
              />
            </div>

            <div className="space-y-3">
              <Label>Forma de pagamento</Label>
              <RadioGroup
                value={paymentMethod}
                onValueChange={(v) => setPaymentMethod(v as "pix" | "card")}
                className="grid grid-cols-2 gap-3"
              >
                <label
                  className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                    paymentMethod === "pix"
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "border-border hover:border-primary/30"
                  }`}
                >
                  <RadioGroupItem value="pix" />
                  <div className="flex items-center gap-2">
                    <QrCode className="w-5 h-5 text-primary" />
                    <span className="text-sm font-medium">PIX</span>
                  </div>
                </label>
                <label
                  className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                    paymentMethod === "card"
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "border-border hover:border-primary/30"
                  }`}
                >
                  <RadioGroupItem value="card" />
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-primary" />
                    <span className="text-sm font-medium">Cartão</span>
                  </div>
                </label>
              </RadioGroup>
            </div>

            {/* Card fields */}
            {paymentMethod === "card" && (
              <div className="space-y-3 pt-1">
                <div className="space-y-2">
                  <Label htmlFor="card_number">Número do cartão</Label>
                  <Input
                    id="card_number"
                    placeholder="0000 0000 0000 0000"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                    maxLength={19}
                    inputMode="numeric"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="card_holder">Nome no cartão</Label>
                  <Input
                    id="card_holder"
                    placeholder="Como está no cartão"
                    value={cardHolder}
                    onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="card_expiry">Validade</Label>
                    <Input
                      id="card_expiry"
                      placeholder="MM/AA"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                      maxLength={5}
                      inputMode="numeric"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="card_cvv">CVV</Label>
                    <Input
                      id="card_cvv"
                      placeholder="123"
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      maxLength={4}
                      inputMode="numeric"
                      type="password"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <Button
            className="w-full font-bold"
            size="lg"
            onClick={handleSubmitPayment}
            disabled={loading || !cpfCnpj.replace(/\D/g, "")}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Processando...
              </>
            ) : paymentMethod === "card" ? (
              <>
                <CreditCard className="w-4 h-4 mr-2" />
                Pagar com Cartão — {selectedPlanData.price}
              </>
            ) : (
              <>
                <QrCode className="w-4 h-4 mr-2" />
                Gerar PIX — {selectedPlanData.price}
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  // Plan selection
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-foreground">Gerenciar Assinatura</h1>
        <p className="text-muted-foreground text-sm">
          Assinando para:{" "}
          <span className="font-medium text-foreground">{organization?.name}</span>
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3 max-w-4xl mx-auto">
        {PLANS.map((plan) => (
          <PlanCard
            key={plan.key}
            name={plan.name}
            price={plan.price}
            description={plan.description}
            features={plan.features}
            cta={plan.cta}
            ctaLink={plan.ctaLink}
            highlighted={plan.highlighted}
            badge={plan.badge}
            currentPlan={currentPlan === plan.key}
            onSelect={
              plan.key !== "free" && plan.key !== currentPlan
                ? () => handleSelectPlan(plan.key)
                : undefined
            }
          />
        ))}
      </div>
    </div>
  );
};

export default SubscriptionTab;
