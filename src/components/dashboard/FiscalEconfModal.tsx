import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, CreditCard, X } from "lucide-react";

interface EconfEvent {
  id: string;
  protocolo: string | null;
  status: string;
  payload_json: any;
  cancelled_at: string | null;
  created_at: string;
}

export default function FiscalEconfModal({
  invoiceId, trigger,
}: {
  invoiceId: string;
  trigger?: React.ReactNode;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [dataPag, setDataPag] = useState(new Date().toISOString().slice(0, 10));
  const [valor, setValor] = useState("");
  const [forma, setForma] = useState("03");
  const [numAut, setNumAut] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: events = [] } = useQuery({
    queryKey: ["fiscal_econf", invoiceId],
    queryFn: async () => {
      const { data } = await supabase.from("fiscal_econf_events")
        .select("id, protocolo, status, payload_json, cancelled_at, created_at")
        .eq("invoice_id", invoiceId)
        .order("created_at", { ascending: false });
      return (data as EconfEvent[]) || [];
    },
    enabled: open,
  });

  async function register() {
    if (!valor || Number(valor) <= 0) { toast.error("Informe o valor pago"); return; }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("fiscal-econf", {
        body: {
          action: "register",
          invoice_id: invoiceId,
          data_pagamento: dataPag,
          valor_pago: Number(valor),
          forma_pagamento: forma,
          numero_autorizacao: numAut || undefined,
        },
      });
      if (error) throw new Error(error.message);
      if ((data as any)?.ok === false) throw new Error((data as any)?.message || "Falha ao registrar");
      toast.success("Conciliação registrada");
      setValor(""); setNumAut("");
      qc.invalidateQueries({ queryKey: ["fiscal_econf", invoiceId] });
    } catch (e: any) {
      toast.error(e?.message || "Erro");
    } finally { setBusy(false); }
  }

  async function cancelEvent(protocolo: string) {
    const justificativa = window.prompt("Justificativa do cancelamento (mín. 15 chars):", "");
    if (!justificativa || justificativa.trim().length < 15) { toast.error("Justificativa mínima 15 chars"); return; }
    try {
      const { data, error } = await supabase.functions.invoke("fiscal-econf", {
        body: { action: "cancel", invoice_id: invoiceId, protocolo, justificativa: justificativa.trim() },
      });
      if (error) throw new Error(error.message);
      if ((data as any)?.ok === false) throw new Error((data as any)?.message || "Falha");
      toast.success("Cancelado");
      qc.invalidateQueries({ queryKey: ["fiscal_econf", invoiceId] });
    } catch (e: any) {
      toast.error(e?.message || "Erro");
    }
  }

  function badge(s: string) {
    if (s === "registered") return <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30">Registrada</Badge>;
    if (s === "cancelled") return <Badge variant="secondary">Cancelada</Badge>;
    if (s === "rejected") return <Badge variant="destructive">Rejeitada</Badge>;
    return <Badge variant="outline">Processando</Badge>;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button size="sm" variant="ghost"><CreditCard className="w-3 h-3 mr-1" /> ECONF</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Conciliação Financeira (ECONF)</DialogTitle>
          <DialogDescription>
            Registra o evento de conciliação de pagamento pós-autorização. Uso facultativo pela SEFAZ.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Data do pagamento</Label>
            <Input type="date" value={dataPag} onChange={(e) => setDataPag(e.target.value)} />
          </div>
          <div>
            <Label>Valor pago (R$)</Label>
            <Input type="number" step="0.01" min="0" value={valor} onChange={(e) => setValor(e.target.value)} />
          </div>
          <div>
            <Label>Forma de pagamento</Label>
            <Select value={forma} onValueChange={setForma}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="01">Dinheiro</SelectItem>
                <SelectItem value="03">Cartão de Crédito</SelectItem>
                <SelectItem value="04">Cartão de Débito</SelectItem>
                <SelectItem value="17">PIX</SelectItem>
                <SelectItem value="99">Outros</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Nº autorização (cartão)</Label>
            <Input value={numAut} onChange={(e) => setNumAut(e.target.value)} placeholder="opcional" />
          </div>
        </div>
        <Button onClick={register} disabled={busy}>
          {busy ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Registrando…</> : "Registrar conciliação"}
        </Button>

        {events.length > 0 && (
          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium mb-2">Eventos ({events.length})</h4>
            <div className="space-y-2 max-h-64 overflow-auto">
              {events.map((ev) => (
                <div key={ev.id} className="text-xs border rounded p-2 flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {badge(ev.status)}
                      {ev.protocolo && <span className="font-mono">#{ev.protocolo}</span>}
                      <span className="text-muted-foreground">
                        R$ {Number(ev.payload_json?.valor_pago || 0).toFixed(2)} · {ev.payload_json?.forma_pagamento}
                      </span>
                    </div>
                    <div className="text-muted-foreground mt-1">
                      Pago em: {ev.payload_json?.data_pagamento} · Registrado {new Date(ev.created_at).toLocaleString("pt-BR")}
                    </div>
                  </div>
                  {ev.status === "registered" && ev.protocolo && (
                    <Button size="sm" variant="ghost" onClick={() => cancelEvent(ev.protocolo!)}>
                      <X className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}