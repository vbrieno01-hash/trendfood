import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { QrCode, Smartphone, Loader2 } from "lucide-react";

export default function WhatsAppConnectTab() {
  const [status, setStatus] = useState<"idle" | "loading" | "ready">("idle");

  const handleGenerateQR = () => {
    setStatus("loading");
    setTimeout(() => setStatus("ready"), 1500);
  };

  return (
    <div className="space-y-6 animate-admin-fade-in">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
          <Smartphone className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-foreground">Conectar WhatsApp</h1>
          <p className="text-sm text-muted-foreground">Vincule uma instância do WhatsApp à sua loja.</p>
        </div>
      </div>

      <div className="admin-glass rounded-2xl p-6 space-y-5 hover:shadow-lg transition-all duration-300">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center">
            <QrCode className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Instância WhatsApp</h3>
            <p className="text-[11px] text-muted-foreground">Escaneie o QR Code para conectar seu número.</p>
          </div>
        </div>

        {status === "idle" && (
          <Button onClick={handleGenerateQR} className="gap-2 rounded-xl hover:scale-105 transition-transform shadow-md shadow-primary/20">
            <QrCode className="w-4 h-4" />
            Gerar QR Code
          </Button>
        )}

        {status === "loading" && (
          <div className="space-y-3">
            <Skeleton className="w-64 h-64 rounded-2xl" />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Gerando QR Code…
            </div>
          </div>
        )}

        {status === "ready" && (
          <div className="space-y-4">
            <div className="w-64 h-64 rounded-2xl border-2 border-dashed border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-transparent flex items-center justify-center">
              <QrCode className="w-24 h-24 text-muted-foreground/30" />
            </div>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-admin-pulse-live absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">QR Code gerado — escaneie com o WhatsApp</span>
            </div>
            <Button variant="outline" size="sm" onClick={() => setStatus("idle")} className="rounded-xl hover:scale-105 transition-transform">
              Gerar novamente
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
