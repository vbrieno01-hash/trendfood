import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { Loader2, AlertTriangle } from "lucide-react";

interface Row {
  id: string;
  serie: number;
  numero_inicial: number;
  numero_final: number;
  justificativa: string;
  status: string;
  protocolo: string | null;
  mensagem_sefaz: string | null;
  environment: string;
  created_at: string;
}

export default function FiscalInutilizationBlock({ organizationId }: { organizationId: string }) {
  const qc = useQueryClient();
  const [serie, setSerie] = useState("1");
  const [iniN, setIniN] = useState("");
  const [finN, setFinN] = useState("");
  const [justificativa, setJustificativa] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: history = [] } = useQuery({
    queryKey: ["fiscal_inutilizations", organizationId],
    queryFn: async () => {
      const { data } = await supabase
        .from("fiscal_inutilizations")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(20);
      return (data as Row[]) || [];
    },
    enabled: !!organizationId,
  });

  async function submit() {
    if (justificativa.trim().length < 15) { toast.error("Justificativa: mínimo 15 caracteres"); return; }
    if (!iniN || !finN) { toast.error("Informe a faixa de números"); return; }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("fiscal-inutilize-range", {
        body: {
          organization_id: organizationId,
          serie: Number(serie),
          numero_inicial: Number(iniN),
          numero_final: Number(finN),
          justificativa: justificativa.trim(),
        },
      });
      if (error) throw new Error(error.message);
      if ((data as any)?.ok === false) throw new Error((data as any)?.message || "Falha ao inutilizar");
      toast.success("Inutilização enviada à SEFAZ");
      setIniN(""); setFinN(""); setJustificativa("");
      qc.invalidateQueries({ queryKey: ["fiscal_inutilizations", organizationId] });
    } catch (e: any) {
      toast.error(e?.message || "Erro ao inutilizar");
    } finally { setBusy(false); }
  }

  function statusBadge(s: string) {
    if (s === "authorized") return <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30">Autorizada</Badge>;
    if (s === "rejected") return <Badge variant="destructive">Rejeitada</Badge>;
    return <Badge variant="secondary">Processando</Badge>;
  }

  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="inutilize" className="border rounded-lg px-4">
        <AccordionTrigger className="hover:no-underline">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span className="font-medium">Inutilizar faixa de numeração</span>
            <span className="text-xs text-muted-foreground font-normal">(uso raro — apenas quando a numeração pula)</span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="space-y-4 pt-2">
          <p className="text-xs text-muted-foreground">
            Use quando um número da sua série de NFC-e não pôde ser autorizado pela SEFAZ e ficou pulado.
            A inutilização informa a SEFAZ que aquela faixa nunca será usada.
          </p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Série</Label>
              <Input type="number" min={1} value={serie} onChange={(e) => setSerie(e.target.value)} />
            </div>
            <div>
              <Label>Número inicial</Label>
              <Input type="number" min={1} value={iniN} onChange={(e) => setIniN(e.target.value)} />
            </div>
            <div>
              <Label>Número final</Label>
              <Input type="number" min={1} value={finN} onChange={(e) => setFinN(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Justificativa <span className="text-xs text-muted-foreground">(15–255 caracteres)</span></Label>
            <Textarea
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              placeholder="Ex.: Falha de comunicação com SEFAZ deixou faixa 45-47 sem autorização."
              maxLength={255}
              rows={3}
            />
            <div className="text-xs text-muted-foreground text-right mt-1">{justificativa.length}/255</div>
          </div>
          <Button onClick={submit} disabled={busy} variant="destructive">
            {busy ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Enviando…</> : "Inutilizar faixa"}
          </Button>

          {history.length > 0 && (
            <div className="pt-4 border-t">
              <h4 className="text-sm font-medium mb-2">Histórico ({history.length})</h4>
              <div className="space-y-2 max-h-64 overflow-auto">
                {history.map((h) => (
                  <div key={h.id} className="text-xs border rounded p-2 flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {statusBadge(h.status)}
                        <span className="font-mono">Série {h.serie} · {h.numero_inicial}–{h.numero_final}</span>
                        <span className="text-muted-foreground">({h.environment})</span>
                      </div>
                      <div className="text-muted-foreground mt-1 line-clamp-2">{h.justificativa}</div>
                      {h.protocolo && <div className="text-muted-foreground">Protocolo: <span className="font-mono">{h.protocolo}</span></div>}
                      {h.mensagem_sefaz && <div className="text-muted-foreground">SEFAZ: {h.mensagem_sefaz}</div>}
                    </div>
                    <div className="text-muted-foreground whitespace-nowrap">
                      {new Date(h.created_at).toLocaleString("pt-BR")}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}