import { useState, useEffect } from "react";
import { Download, Smartphone, Share, Plus, CheckCircle2, Zap, Bell, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getPublicHost } from "@/lib/publicUrl";
import PageSeo from "@/components/seo/PageSeo";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const InstallPage = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    // Detecta se já está instalado
    const standalone = window.matchMedia("(display-mode: standalone)").matches
      || (navigator as any).standalone === true;
    setIsInstalled(standalone);

    // Detecta iOS
    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream);

    // Captura evento de instalação (Chrome/Android)
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
    setInstalling(false);
  };

  const benefits = [
    { icon: Zap, title: "Acesso instantâneo", desc: "Abra direto da tela inicial, sem digitar URL" },
    { icon: Smartphone, title: "Tela cheia", desc: "Sem barra do navegador, como um app nativo" },
    { icon: Bell, title: "Notificações", desc: "Receba alertas de novos pedidos em tempo real" },
    { icon: Wifi, title: "Mais rápido", desc: "Carregamento otimizado com cache inteligente" },
  ];

  if (isInstalled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <PageSeo title="Instalar TrendFood" description="Instale o TrendFood no seu dispositivo." path="/instalar" noindex />
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <CheckCircle2 className="mx-auto h-16 w-16 text-green-500" />
            <h1 className="text-2xl font-bold text-foreground">TrendFood já está instalado!</h1>
            <p className="text-muted-foreground">
              Você já pode acessar o TrendFood direto da tela inicial do seu dispositivo.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <PageSeo title="Instalar TrendFood" description="Instale o TrendFood no seu dispositivo." path="/instalar" noindex />
      <div className="max-w-md w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="mx-auto w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
            <img src="/pwa-192.png" alt="TrendFood" className="w-16 h-16 rounded-xl" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Instalar TrendFood</h1>
          <p className="text-muted-foreground text-sm">
            Adicione o TrendFood à tela inicial e tenha acesso rápido ao seu painel de gestão.
          </p>
        </div>

        {/* Benefits */}
        <div className="grid grid-cols-2 gap-3">
          {benefits.map((b) => (
            <Card key={b.title} className="border-border/50">
              <CardContent className="p-4 space-y-2">
                <b.icon className="h-6 w-6 text-primary" />
                <p className="font-medium text-sm text-foreground">{b.title}</p>
                <p className="text-xs text-muted-foreground">{b.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Install action */}
        {isIOS ? (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-5 space-y-4">
              <p className="font-semibold text-foreground text-center">Como instalar no iPhone/iPad</p>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">1</div>
                  <div>
                    <p className="text-sm font-medium text-foreground flex items-center gap-1">
                      Toque em <Share className="h-4 w-4 inline text-blue-500" /> Compartilhar
                    </p>
                    <p className="text-xs text-muted-foreground">Na barra inferior do Safari</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">2</div>
                  <div>
                    <p className="text-sm font-medium text-foreground flex items-center gap-1">
                      Toque em <Plus className="h-4 w-4 inline" /> Adicionar à Tela de Início
                    </p>
                    <p className="text-xs text-muted-foreground">Role para baixo se não aparecer</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">3</div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Toque em Adicionar</p>
                    <p className="text-xs text-muted-foreground">Pronto! O ícone aparecerá na sua tela</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : deferredPrompt ? (
          <Button
            onClick={handleInstall}
            disabled={installing}
            className="w-full h-14 text-base font-semibold gap-2"
            size="lg"
          >
            <Download className="h-5 w-5" />
            {installing ? "Instalando..." : "Instalar TrendFood"}
          </Button>
        ) : (
          <Card className="border-border/50">
            <CardContent className="p-5 text-center space-y-2">
              <Smartphone className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Abra este link no <strong>Chrome</strong> do seu celular para instalar o app.
              </p>
              <p className="text-xs text-muted-foreground/70 font-mono break-all">
                {getPublicHost()}/instalar
              </p>
            </CardContent>
          </Card>
        )}

        <p className="text-center text-xs text-muted-foreground">
          Grátis • Sem loja de apps • Atualiza automaticamente
        </p>
      </div>
    </div>
  );
};

export default InstallPage;
