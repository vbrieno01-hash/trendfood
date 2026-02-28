import { useState } from "react";
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

  const handleSubmitPayment = async () => {
    if (!organization || !session || !selectedPlan) return;

    const cleanDoc = cpfCnpj.replace(/\D/g, "");
    if (cleanDoc.length !== 11 && cleanDoc.length !== 14) {
      toast.error("CPF ou CNPJ inválido");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-mp-payment", {
        body: {
          org_id: organization.id,
          plan: selectedPlan,
          cpf_cnpj: cleanDoc,
          payment_method: paymentMethod,
        },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.details || data.error);

      if (data.status === "approved") {
        toast.success("Pagamento aprovado! Seu plano foi atualizado 🎉");
        handleBack();
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
                  className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all opacity-50 pointer-events-none ${
                    paymentMethod === "card"
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "border-border"
                  }`}
                >
                  <RadioGroupItem value="card" disabled />
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    <div>
                      <span className="text-sm font-medium">Cartão</span>
                      <p className="text-[10px] text-muted-foreground">Em breve</p>
                    </div>
                  </div>
                </label>
              </RadioGroup>
            </div>
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
