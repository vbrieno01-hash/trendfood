import { Link } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Printer,
  CheckCircle2,
  AlertCircle,
  Monitor,
  Chrome,
  Wifi,
  ArrowLeft,
  Settings,
  ToggleRight,
  TestTube2,
  Star,
  MessageCircle,
  Info,
  XCircle,
  FileWarning,
  QrCode,
  Zap,
  Type,
} from "lucide-react";

// ── Receipt preview component ──────────────────────────────────────────────────
function ReceiptPreview() {
  return (
    <div className="flex justify-center">
      <div
        className="bg-white text-black rounded-lg border border-border shadow-lg p-4"
        style={{ width: "260px", fontFamily: "'Courier New', Courier, monospace", fontSize: "13px" }}
      >
        <div className="text-center mb-2">
          <div className="font-bold text-base uppercase tracking-wide">🍕 PIZZARIA DO ZÉ</div>
        </div>
        <div className="border-t border-dashed border-gray-400 my-2" />
        <div className="flex justify-between items-baseline mb-1">
          <span className="font-bold text-xl">MESA 5</span>
          <span className="text-xs text-gray-500">19/02 — 20:14</span>
        </div>
        <div className="border-t border-dashed border-gray-400 my-2" />
        <table className="w-full" style={{ borderCollapse: "collapse" }}>
          <tbody>
            <tr>
              <td className="font-bold pr-1 align-top" style={{ width: "28px" }}>2x</td>
              <td className="align-top">Pizza Margherita</td>
              <td className="text-right text-xs text-gray-500 align-top whitespace-nowrap">R$ 79,80</td>
            </tr>
            <tr>
              <td className="font-bold pr-1 align-top">1x</td>
              <td className="align-top">Coca-Cola 2L</td>
              <td className="text-right text-xs text-gray-500 align-top whitespace-nowrap">R$ 12,00</td>
            </tr>
            <tr>
              <td className="font-bold pr-1 align-top">1x</td>
              <td className="align-top">Tiramisu</td>
              <td className="text-right text-xs text-gray-500 align-top whitespace-nowrap">R$ 18,00</td>
            </tr>
          </tbody>
        </table>
        <div className="border-t border-dashed border-gray-400 my-2" />
        <div className="font-bold text-base text-right tracking-wide">TOTAL: R$ 109,80</div>
        <div className="border-t border-dashed border-gray-400 my-2" />
        {/* QR Code visual simulado */}
        <div className="flex flex-col items-center py-2 gap-1">
          <div
            className="rounded"
            style={{
              width: "80px",
              height: "80px",
              background: `repeating-linear-gradient(
                0deg,
                transparent,
                transparent 2px,
                #000 2px,
                #000 4px
              ),
              repeating-linear-gradient(
                90deg,
                transparent,
                transparent 2px,
                #000 2px,
                #000 4px
              )`,
              opacity: 0.85,
            }}
          />
          <span className="text-xs font-bold tracking-wide">📱 Pague com Pix</span>
        </div>
        <div className="border-t border-dashed border-gray-400 my-2" />
        <div className="text-center text-gray-500 uppercase tracking-widest" style={{ fontSize: "10px" }}>
          ★ novo pedido — kds ★
        </div>
      </div>
    </div>
  );
}

// ── Step badge ─────────────────────────────────────────────────────────────────
function StepBadge({ n }: { n: number }) {
  return (
    <div className="shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
      {n}
    </div>
  );
}

// ── Section wrapper ────────────────────────────────────────────────────────────
function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-muted/30">
        <div className="text-primary">{icon}</div>
        <h2 className="font-semibold text-foreground text-base">{title}</h2>
      </div>
      <div className="px-6 py-5">{children}</div>
    </section>
  );
}

// ── Trouble card ───────────────────────────────────────────────────────────────
function TroubleCard({
  icon,
  problem,
  solution,
}: {
  icon: React.ReactNode;
  problem: string;
  solution: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-background p-4 space-y-2">
      <div className="flex items-start gap-2">
        <div className="text-destructive mt-0.5 shrink-0">{icon}</div>
        <p className="text-sm font-semibold text-foreground">{problem}</p>
      </div>
      <div className="flex items-start gap-2 pl-6">
        <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
        <p className="text-sm text-muted-foreground">{solution}</p>
      </div>
    </div>
  );
}

// ── Printer card ───────────────────────────────────────────────────────────────
function PrinterCard({ name, model, price }: { name: string; model: string; price: string }) {
  return (
    <div className="rounded-xl border border-border bg-background p-4 flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <Printer className="w-4 h-4 text-primary shrink-0" />
        <span className="font-semibold text-sm text-foreground">{name}</span>
      </div>
      <span className="text-xs text-muted-foreground pl-6">{model}</span>
      <span className="text-xs font-medium text-primary pl-6">{price}</span>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function DocsTerminalPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shrink-0">
              <Printer className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-base font-bold text-foreground leading-none">TrendFood</h1>
              <p className="text-xs text-muted-foreground mt-0.5">Documentação — Impressora Térmica</p>
            </div>
          </div>
          <Link
            to="/dashboard"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:block">Voltar ao dashboard</span>
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-6">

        {/* Hero */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-2xl font-bold text-foreground">Impressora Térmica 80mm</h2>
            <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400 border-0 text-xs">Beta</Badge>
          </div>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Guia completo para configurar a impressão automática de pedidos diretamente da cozinha (KDS),
            com recibos formatados para 80mm e QR Code PIX gerado automaticamente.
          </p>
        </div>

        {/* Seção 1 — Visão Geral */}
        <Section title="Como funciona" icon={<Info className="w-5 h-5" />}>
          <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
            <p>
              Quando um novo pedido chega no <strong className="text-foreground">KDS (aba Cozinha)</strong> e o toggle
              {" "}<strong className="text-foreground">Imprimir automático</strong> está ativado, o sistema:
            </p>
            <ol className="space-y-2 list-none">
              {[
                "Abre uma janela popup com o recibo formatado para 80mm",
                "Dispara o diálogo de impressão automaticamente após 500ms",
                "Fecha a janela assim que a impressão é confirmada",
                "Gera o QR Code PIX dinamicamente com o valor total do pedido",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ol>
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Baseado em padrão oficial</AlertTitle>
              <AlertDescription>
                O QR Code PIX é gerado seguindo o padrão <strong>EMV/QRCPS-MPM do Banco Central do Brasil</strong>,
                compatível com todos os apps bancários.
              </AlertDescription>
            </Alert>
          </div>
        </Section>

        {/* Seção 2 — Requisitos */}
        <Section title="Requisitos" icon={<CheckCircle2 className="w-5 h-5" />}>
          <div className="grid sm:grid-cols-3 gap-4 text-sm">
            <div className="rounded-xl border border-border bg-background p-4 space-y-2">
              <div className="flex items-center gap-2 text-foreground font-semibold">
                <Printer className="w-4 h-4 text-primary" /> Hardware
              </div>
              <ul className="space-y-1 text-muted-foreground text-xs">
                <li>• Impressora térmica 80mm</li>
                <li>• Conexão USB ou rede local</li>
                <li>• Driver instalado no SO</li>
                <li>• Papel termo 80mm</li>
              </ul>
            </div>
            <div className="rounded-xl border border-border bg-background p-4 space-y-2">
              <div className="flex items-center gap-2 text-foreground font-semibold">
                <Monitor className="w-4 h-4 text-primary" /> Sistema
              </div>
              <ul className="space-y-1 text-muted-foreground text-xs">
                <li>• Windows, macOS ou Linux</li>
                <li>• Driver da impressora instalado</li>
                <li>• Popup bloqueado <em>desativado</em></li>
                <li>• Tamanho de página: 80mm × Auto</li>
              </ul>
            </div>
            <div className="rounded-xl border border-border bg-background p-4 space-y-2">
              <div className="flex items-center gap-2 text-foreground font-semibold">
                <Chrome className="w-4 h-4 text-primary" /> Navegador
              </div>
              <ul className="space-y-1 text-muted-foreground text-xs">
                <li>• Google Chrome (recomendado)</li>
                <li>• Microsoft Edge</li>
                <li>• Firefox (funcional)</li>
                <li>• Qualquer browser moderno</li>
              </ul>
            </div>
          </div>
        </Section>

        {/* Seção 3 — Passo a Passo */}
        <Section title="Passo a passo de configuração" icon={<Settings className="w-5 h-5" />}>
          <div className="space-y-5">

            {/* Passo 1 */}
            <div className="flex gap-4">
              <StepBadge n={1} />
              <div className="space-y-1 flex-1">
                <p className="font-semibold text-sm text-foreground">Configure sua chave PIX</p>
                <p className="text-sm text-muted-foreground">
                  No dashboard, acesse <strong className="text-foreground">Configurações → Chave PIX</strong> e
                  cadastre sua chave (CPF, CNPJ, e-mail, telefone ou chave aleatória).
                  O QR Code só será gerado se a chave estiver configurada.
                </p>
              </div>
            </div>

            <Separator />

            {/* Passo 2 */}
            <div className="flex gap-4">
              <StepBadge n={2} />
              <div className="space-y-1 flex-1">
                <p className="font-semibold text-sm text-foreground">Abra a aba Cozinha (KDS)</p>
                <p className="text-sm text-muted-foreground">
                  No menu lateral do dashboard, clique em <strong className="text-foreground">Cozinha</strong>.
                  Esta é a tela que os funcionários da cozinha utilizam para ver os pedidos em tempo real.
                </p>
              </div>
            </div>

            <Separator />

            {/* Passo 3 */}
            <div className="flex gap-4">
              <StepBadge n={3} />
              <div className="space-y-1 flex-1">
                <p className="font-semibold text-sm text-foreground flex items-center gap-2">
                  Ative o toggle <ToggleRight className="w-4 h-4 text-primary inline" /> Imprimir automático
                </p>
                <p className="text-sm text-muted-foreground">
                  No canto superior direito da aba Cozinha, ative o toggle{" "}
                  <code className="bg-muted rounded px-1.5 py-0.5 text-xs font-mono">Imprimir automático</code>.
                  Esta preferência é salva por dispositivo — cada computador/tablet precisa ativar
                  separadamente.
                </p>
              </div>
            </div>

            <Separator />

            {/* Passo 4 */}
            <div className="flex gap-4">
              <StepBadge n={4} />
              <div className="space-y-1 flex-1">
                <p className="font-semibold text-sm text-foreground">Configure o tamanho de página no sistema operacional</p>
                <p className="text-sm text-muted-foreground mb-3">
                  Este é o passo mais importante. A impressora precisa estar configurada com o tamanho
                  correto de papel, caso contrário o recibo será cortado ou impresso com margens erradas.
                </p>
                <div className="space-y-2">
                  <div className="rounded-lg bg-muted/50 border border-border p-3 text-xs space-y-1">
                    <p className="font-semibold text-foreground">🪟 Windows</p>
                    <p className="text-muted-foreground">
                      Painel de Controle → Dispositivos e Impressoras → clique direito na impressora →
                      Preferências de impressão → Papel → Definir tamanho personalizado:{" "}
                      <code className="bg-background rounded px-1 font-mono">80mm × 0mm</code> (altura 0 = automático)
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/50 border border-border p-3 text-xs space-y-1">
                    <p className="font-semibold text-foreground">🍎 macOS</p>
                    <p className="text-muted-foreground">
                      Preferências do Sistema → Impressoras e Scanners → selecione a impressora →
                      Opções e Consumíveis → Papel personalizado:{" "}
                      <code className="bg-background rounded px-1 font-mono">80mm × 200mm</code>
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/50 border border-border p-3 text-xs space-y-1">
                    <p className="font-semibold text-foreground">🐧 Linux (CUPS)</p>
                    <p className="text-muted-foreground">
                      Acesse <code className="bg-background rounded px-1 font-mono">localhost:631</code> →
                      Administration → Manage Printers → configurar{" "}
                      <code className="bg-background rounded px-1 font-mono">80x200mm</code>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Passo 5 */}
            <div className="flex gap-4">
              <StepBadge n={5} />
              <div className="space-y-1 flex-1">
                <p className="font-semibold text-sm text-foreground">Defina como impressora padrão</p>
                <p className="text-sm text-muted-foreground">
                  Configure a impressora térmica como <strong className="text-foreground">padrão do sistema</strong>.
                  Assim, quando o diálogo de impressão abrir, ela já estará selecionada automaticamente —
                  sem precisar escolher toda vez.
                </p>
              </div>
            </div>

            <Separator />

            {/* Passo 6 */}
            <div className="flex gap-4">
              <StepBadge n={6} />
              <div className="space-y-1 flex-1">
                <p className="font-semibold text-sm text-foreground flex items-center gap-2">
                  <TestTube2 className="w-4 h-4 text-primary" />
                  Teste com um pedido real
                </p>
                <p className="text-sm text-muted-foreground">
                  Faça um pedido de teste pelo cardápio ({" "}
                  <code className="bg-muted rounded px-1.5 py-0.5 text-xs font-mono">/unidade/sua-loja</code>
                  ) e confirme que o popup abre, o diálogo de impressão aparece automaticamente e o recibo
                  sai formatado corretamente.
                </p>
              </div>
            </div>

          </div>
        </Section>

        {/* Seção 4 — Exemplo de Recibo */}
        <Section title="Exemplo de recibo impresso" icon={<Printer className="w-5 h-5" />}>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Veja como o recibo ficará ao sair da impressora. Inclui nome da loja, mesa ou tipo de entrega,
              itens com valores, total e QR Code PIX para pagamento.
            </p>
            <ReceiptPreview />
          </div>
        </Section>

        {/* Seção 5 — Troubleshooting */}
        <Section title="Solução de problemas" icon={<AlertCircle className="w-5 h-5" />}>
          <div className="space-y-3">
            <TroubleCard
              icon={<XCircle className="w-4 h-4" />}
              problem="Popup bloqueado — janela de impressão não abre"
              solution='Acesse as configurações do navegador e permita popups para este site. No Chrome: clique no ícone 🚫 na barra de endereços → "Sempre permitir popups de trendfood.lovable.app".'
            />
            <TroubleCard
              icon={<FileWarning className="w-4 h-4" />}
              problem="Impressão cortando conteúdo ou margens erradas"
              solution="Configure o tamanho de página da impressora no sistema operacional para 80mm × automático (0mm de altura). Veja o Passo 4 acima para instruções detalhadas por sistema operacional."
            />
            <TroubleCard
              icon={<QrCode className="w-4 h-4" />}
              problem="QR Code PIX não aparece no recibo"
              solution="A chave PIX precisa estar cadastrada nas Configurações do dashboard. Acesse Dashboard → Configurações → Chave PIX e salve sua chave antes de imprimir."
            />
            <TroubleCard
              icon={<Zap className="w-4 h-4" />}
              problem="Impressão não dispara automaticamente"
              solution='Verifique se o toggle "Imprimir automático" está ativado na aba Cozinha. Esta preferência é salva por dispositivo — cada computador precisa ativar separadamente.'
            />
            <TroubleCard
              icon={<Type className="w-4 h-4" />}
              problem="Acentos e caracteres especiais quebrados (â, ã, ç)"
              solution="O recibo utiliza UTF-8 e a fonte Courier New. Verifique se o driver da impressora está configurado para codificação UTF-8. Modelos mais antigos podem não suportar acentos — neste caso, o sistema já normaliza os dados do cliente automaticamente."
            />
            <TroubleCard
              icon={<Wifi className="w-4 h-4" />}
              problem="Impressora em rede não é detectada"
              solution="Certifique-se de que o driver está instalado no computador e a impressora aparece em Dispositivos e Impressoras do sistema operacional. A impressão é feita pelo sistema operacional, não diretamente pela rede."
            />
          </div>
        </Section>

        {/* Seção 6 — Impressoras Recomendadas */}
        <Section title="Impressoras recomendadas no Brasil" icon={<Star className="w-5 h-5" />}>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Modelos testados e amplamente utilizados em estabelecimentos no Brasil:
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              <PrinterCard
                name="Elgin i9"
                model="USB + Serial + Ethernet | Guilhotina automática"
                price="~R$ 450 – R$ 600"
              />
              <PrinterCard
                name="Bematech MP-4200 TH"
                model="USB + Serial | Muito popular em PDVs"
                price="~R$ 500 – R$ 700"
              />
              <PrinterCard
                name="Epson TM-T20X"
                model="USB + Serial | Alta durabilidade"
                price="~R$ 700 – R$ 900"
              />
              <PrinterCard
                name="Daruma DR800"
                model="USB + Bluetooth | Compacta"
                price="~R$ 350 – R$ 500"
              />
            </div>
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Compatibilidade</AlertTitle>
              <AlertDescription className="text-xs">
                Qualquer impressora térmica 80mm que apareça como dispositivo no sistema operacional é
                compatível — o sistema usa o diálogo de impressão nativo do navegador.
              </AlertDescription>
            </Alert>
          </div>
        </Section>

        {/* Footer */}
        <div className="rounded-2xl bg-card border border-border p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-foreground text-sm">Ainda com dúvidas?</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Nossa equipe responde no WhatsApp em minutos durante o horário comercial.
            </p>
          </div>
          <a
            href="https://wa.me/5511999999999?text=Olá%2C%20preciso%20de%20ajuda%20com%20a%20impressora%20térmica%20no%20TrendFood"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors shrink-0"
          >
            <MessageCircle className="w-4 h-4" />
            Falar no WhatsApp
          </a>
        </div>

      </main>
    </div>
  );
}
