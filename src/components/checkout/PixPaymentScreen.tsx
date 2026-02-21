import { useState, useEffect, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { useGeneratePixPayload } from "@/hooks/useGeneratePixPayload";
import { useCreatePixCharge, useCheckPixStatus } from "@/hooks/usePixAutomation";
import { CheckCircle2, Copy, Clock, Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PixPaymentScreenProps {
  amount: number;
  orgId: string;
  orgName: string;
  pixConfirmationMode: string;
  primaryColor: string;
  onSuccess: (orderId: string, paid: boolean) => void;
  onCancel: () => void;
  /** Pre-created order ID */
  orderId: string;
}

const EXPIRY_SECONDS = 600; // 10 minutes

export default function PixPaymentScreen({
  amount,
  orgId,
  orgName,
  pixConfirmationMode,
  primaryColor,
  onSuccess,
  onCancel,
  orderId,
}: PixPaymentScreenProps) {
  const { toast } = useToast();
  const { createCharge, loading: chargeLoading, error: chargeError, data: chargeData } = useCreatePixCharge();
  const { generate: generatePayload, payload: staticPayload } = useGeneratePixPayload();

  const [countdown, setCountdown] = useState(EXPIRY_SECONDS);
  const [expired, setExpired] = useState(false);
  const [copied, setCopied] = useState(false);
  const [manualConfirmed, setManualConfirmed] = useState(false);

  const hasGateway = pixConfirmationMode === "automatic";

  // Try to create charge via gateway
  useEffect(() => {
    if (hasGateway && orderId) {
      createCharge(orgId, orderId, amount, `Pedido ${orgName}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  // Generate static payload via edge function (non-gateway mode)
  useEffect(() => {
    if (!hasGateway && orderId) {
      generatePayload(orgId, amount);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  // Countdown timer
  useEffect(() => {
    if (expired || manualConfirmed) return;
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setExpired(true);
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [expired, manualConfirmed]);

  // Poll for payment status (gateway mode only)
  const { paid } = useCheckPixStatus(
    orgId,
    chargeData?.payment_id ?? null,
    orderId,
    hasGateway && !!chargeData?.payment_id && !expired
  );

  // When paid via gateway
  useEffect(() => {
    if (paid) {
      onSuccess(orderId, true);
    }
  }, [paid, orderId, onSuccess]);

  // The payload to display: gateway's copia-e-cola or static from edge function
  const pixCopiaECola = chargeData?.pix_copia_e_cola || staticPayload;
  const qrCodeBase64 = chargeData?.qr_code_base64 || null;

  const handleCopy = useCallback(() => {
    if (!pixCopiaECola) return;
    navigator.clipboard.writeText(pixCopiaECola).then(() => {
      setCopied(true);
      toast({ title: "Código PIX copiado!" });
      setTimeout(() => setCopied(false), 3000);
    });
  }, [pixCopiaECola, toast]);

  const handleManualConfirm = () => {
    setManualConfirmed(true);
    onSuccess(orderId, false); // paid=false, awaiting manual confirmation
  };

  const fmt = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  const minutes = Math.floor(countdown / 60);
  const seconds = countdown % 60;

  if (expired) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 px-4 text-center">
        <AlertCircle className="w-12 h-12 text-destructive" />
        <h3 className="text-lg font-bold text-foreground">Tempo esgotado</h3>
        <p className="text-sm text-muted-foreground">
          O prazo para pagamento expirou. Tente novamente.
        </p>
        <Button variant="outline" onClick={onCancel}>Voltar</Button>
      </div>
    );
  }

  // Loading state (gateway)
  if (hasGateway && chargeLoading) {
    return (
      <div className="flex flex-col items-center gap-4 py-12 px-4">
        <Loader2 className="w-10 h-10 animate-spin" style={{ color: primaryColor }} />
        <p className="text-sm text-muted-foreground">Gerando cobrança PIX...</p>
      </div>
    );
  }

  // Gateway error
  if (hasGateway && chargeError && !chargeData) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 px-4 text-center">
        <AlertCircle className="w-10 h-10 text-destructive" />
        <h3 className="text-base font-bold text-foreground">Erro ao gerar cobrança</h3>
        <p className="text-sm text-muted-foreground">{chargeError}</p>
        <p className="text-xs text-muted-foreground">Usando QR Code estático como alternativa.</p>
        {/* Fallback to static — edge function will be called */}
        {!staticPayload && (
          <Button variant="outline" onClick={onCancel}>Voltar</Button>
        )}
      </div>
    );
  }

  // No pix key and no gateway data
  if (!pixCopiaECola && !qrCodeBase64) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 px-4 text-center">
        <AlertCircle className="w-10 h-10 text-muted-foreground" />
        <h3 className="text-base font-bold text-foreground">PIX não configurado</h3>
        <p className="text-sm text-muted-foreground">
          A loja ainda não configurou uma chave PIX. Entre em contato pelo WhatsApp.
        </p>
        <Button variant="outline" onClick={onCancel}>Voltar</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-5 py-4 px-4">
      {/* Amount */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground">Valor a pagar</p>
        <p className="text-2xl font-bold text-foreground">{fmt(amount)}</p>
      </div>

      {/* Timer */}
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Clock className="w-4 h-4" />
        <span>
          Expira em {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
        </span>
      </div>

      {/* QR Code */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border">
        {qrCodeBase64 ? (
          <img
            src={qrCodeBase64.startsWith("data:") ? qrCodeBase64 : `data:image/png;base64,${qrCodeBase64}`}
            alt="QR Code PIX"
            className="w-52 h-52"
          />
        ) : pixCopiaECola ? (
          <QRCodeSVG value={pixCopiaECola} size={208} />
        ) : null}
      </div>

      {/* Copia e cola */}
      {pixCopiaECola && (
        <div className="w-full space-y-2">
          <p className="text-xs text-muted-foreground text-center font-medium">PIX Copia e Cola</p>
          <div
            className="bg-secondary rounded-xl p-3 text-xs text-foreground break-all max-h-20 overflow-y-auto cursor-pointer border border-border"
            onClick={handleCopy}
          >
            {pixCopiaECola}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2"
            onClick={handleCopy}
          >
            {copied ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copiado!" : "Copiar código"}
          </Button>
        </div>
      )}

      {/* Status indicator */}
      {hasGateway && chargeData ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          Aguardando pagamento...
        </div>
      ) : (
        <Button
          className="w-full font-semibold"
          style={{ backgroundColor: primaryColor }}
          onClick={handleManualConfirm}
        >
          ✅ Já paguei
        </Button>
      )}

      <Button variant="ghost" size="sm" onClick={onCancel} className="text-muted-foreground">
        Cancelar
      </Button>
    </div>
  );
}
