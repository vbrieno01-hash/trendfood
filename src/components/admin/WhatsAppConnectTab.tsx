import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { QrCode, Smartphone, CheckCircle2, Loader2 } from "lucide-react";

export default function WhatsAppConnectTab() {
  const [status, setStatus] = useState<"idle" | "loading" | "ready">("idle");

  const handleGenerateQR = () => {
    setStatus("loading");
    setTimeout(() => setStatus("ready"), 1500);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-bold text-foreground">Conectar WhatsApp</h1>
        <p className="text-sm text-muted-foreground">Vincule uma instância do WhatsApp à sua loja.</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <CardTitle className="text-base">Instância WhatsApp</CardTitle>
              <CardDescription>Escaneie o QR Code para conectar seu número.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === "idle" && (
            <Button onClick={handleGenerateQR} className="gap-2">
              <QrCode className="w-4 h-4" />
              Gerar QR Code
            </Button>
          )}

          {status === "loading" && (
            <div className="space-y-3">
              <Skeleton className="w-64 h-64 rounded-xl" />
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Gerando QR Code…
              </div>
            </div>
          )}

          {status === "ready" && (
            <div className="space-y-3">
              <div className="w-64 h-64 rounded-xl border border-border bg-muted flex items-center justify-center">
                <QrCode className="w-24 h-24 text-muted-foreground/40" />
              </div>
              <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                QR Code gerado — escaneie com o WhatsApp
              </div>
              <Button variant="outline" size="sm" onClick={() => setStatus("idle")}>
                Gerar novamente
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
