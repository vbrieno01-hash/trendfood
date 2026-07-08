import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Mail, X } from "lucide-react";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function FiscalEmailModal({
  invoiceId, trigger, defaultEmail,
}: {
  invoiceId: string;
  trigger?: React.ReactNode;
  defaultEmail?: string;
}) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [emails, setEmails] = useState<string[]>(defaultEmail ? [defaultEmail] : []);
  const [busy, setBusy] = useState(false);

  function addEmail() {
    const e = input.trim().toLowerCase();
    if (!e) return;
    if (!EMAIL_RE.test(e)) { toast.error("E-mail inválido"); return; }
    if (emails.includes(e)) { toast.error("Já adicionado"); return; }
    if (emails.length >= 10) { toast.error("Máximo 10 e-mails"); return; }
    setEmails([...emails, e]);
    setInput("");
  }

  function remove(e: string) { setEmails(emails.filter((x) => x !== e)); }

  async function send() {
    if (emails.length === 0) { toast.error("Adicione ao menos um e-mail"); return; }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("fiscal-send-email", {
        body: { invoice_id: invoiceId, emails },
      });
      if (error) throw new Error(error.message);
      if ((data as any)?.ok === false) throw new Error((data as any)?.message || "Falha ao enviar");
      toast.success((data as any)?.mensagem || "E-mails agendados para envio");
      setOpen(false);
      setEmails(defaultEmail ? [defaultEmail] : []);
    } catch (e: any) {
      toast.error(e?.message || "Erro ao enviar");
    } finally { setBusy(false); }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button size="sm" variant="secondary"><Mail className="w-3 h-3 mr-1" /> Enviar por e-mail</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enviar NFC-e por e-mail</DialogTitle>
          <DialogDescription>
            Máximo de 10 destinatários. O envio é feito em segundo plano pela Focus NFe.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="cliente@exemplo.com"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addEmail(); } }}
            />
            <Button type="button" variant="outline" onClick={addEmail}>Adicionar</Button>
          </div>
          <div className="flex flex-wrap gap-2 min-h-[40px]">
            {emails.map((e) => (
              <Badge key={e} variant="secondary" className="gap-1 pr-1">
                {e}
                <button
                  type="button"
                  onClick={() => remove(e)}
                  className="ml-1 rounded hover:bg-muted p-0.5"
                  aria-label={`Remover ${e}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
            {emails.length === 0 && <span className="text-xs text-muted-foreground">Nenhum e-mail adicionado.</span>}
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>Cancelar</Button>
          <Button onClick={send} disabled={busy || emails.length === 0}>
            {busy ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Enviando…</> : `Enviar (${emails.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}