import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Zap, Send, AlertTriangle, CheckCircle2 } from "lucide-react";

interface Props {
  orgId: string;
}

const EVENT_LABELS: Record<string, string> = {
  pending: "Pedido recebido",
  preparing: "Pedido aceito (em preparo)",
  awaiting_payment: "Aguardando pagamento PIX",
  ready_pickup: "Pronto para retirada",
  ready_delivery: "Saiu para entrega",
  delivered: "Entregue",
  cancelled: "Cancelado",
};

const EVENT_ORDER = [
  "pending",
  "awaiting_payment",
  "preparing",
  "ready_pickup",
  "ready_delivery",
  "delivered",
  "cancelled",
];

interface OutboxRow {
  id: string;
  phone: string;
  message: string;
  event_type: string;
  status: string;
  last_error: string | null;
  created_at: string;
  sent_at: string | null;
}

export default function WhatsAppAutoStatusCard({ orgId }: Props) {
  const [enabled, setEnabled] = useState(false);
  const [templates, setTemplates] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [outbox, setOutbox] = useState<OutboxRow[]>([]);

  const load = async () => {
    const [orgRes, obxRes] = await Promise.all([
      supabase.from("organizations").select("wa_auto_status").eq("id", orgId).maybeSingle(),
      supabase
        .from("whatsapp_outbox" as any)
        .select("id, phone, message, event_type, status, last_error, created_at, sent_at")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);
    const cfg = (orgRes.data as any)?.wa_auto_status || {};
    setEnabled(!!cfg.enabled);
    setTemplates(cfg.templates || {});
    setOutbox((obxRes.data as any) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("wa-outbox-" + orgId)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "whatsapp_outbox", filter: `organization_id=eq.${orgId}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("organizations")
      .update({ wa_auto_status: { enabled, templates } as any })
      .eq("id", orgId);
    setSaving(false);
    if (error) toast.error("Erro: " + error.message);
    else toast.success("Configurações salvas");
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-primary/20">
        <CardContent className="pt-6 space-y-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                Status automático no WhatsApp
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Avisa o cliente sozinho em cada etapa do pedido. Você não precisa apertar nada.
              </p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          <div className="text-xs text-muted-foreground bg-muted/50 rounded p-3">
            Variáveis disponíveis:{" "}
            <code className="font-mono">{"{nome}"}</code>,{" "}
            <code className="font-mono">{"{numero}"}</code>,{" "}
            <code className="font-mono">{"{loja}"}</code>,{" "}
            <code className="font-mono">{"{total}"}</code>,{" "}
            <code className="font-mono">{"{avaliacao_url}"}</code>
          </div>

          <div className="space-y-3">
            {EVENT_ORDER.map((ev) => (
              <div key={ev} className="space-y-1">
                <Label className="text-xs font-semibold">{EVENT_LABELS[ev]}</Label>
                <Textarea
                  rows={2}
                  value={templates[ev] || ""}
                  onChange={(e) => setTemplates({ ...templates, [ev]: e.target.value })}
                  placeholder="Deixe em branco para não enviar este aviso"
                  className="text-sm"
                />
              </div>
            ))}
          </div>

          <Button onClick={save} disabled={saving} className="w-full">
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Salvar
          </Button>
        </CardContent>
      </Card>

    </div>
  );
}