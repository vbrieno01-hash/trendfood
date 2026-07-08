import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { useTables, useAddTable, useDeleteTable } from "@/hooks/useOrders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Organization } from "@/hooks/useOrganization";
import { getPublicBaseUrl } from "@/lib/publicUrl";
import {
  Copy, Trash2, QrCode, Grid3X3, Plus,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import FirstAccessBanner from "@/components/dashboard/FirstAccessBanner";
import { CommandHeader, MetricTile, CommandEmpty } from "@/components/dashboard/command";

interface Props { organization: Organization; tableLimit?: number | null }

export default function TablesTab({ organization, tableLimit }: Props) {
  const { data: tables = [], isLoading } = useTables(organization.id);
  const addTable = useAddTable(organization.id);
  const deleteTable = useDeleteTable(organization.id);
  const { toast } = useToast();
  const navigate = useNavigate();

  const [addOpen, setAddOpen] = useState(false);
  const [tableNumber, setTableNumber] = useState("");
  const [tableLabel, setTableLabel] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [qrModal, setQrModal] = useState<{ number: number } | null>(null);
  const qrRef = useRef<SVGSVGElement | null>(null);

  const getUrl = (num: number) => `${getPublicBaseUrl()}/unidade/${organization.slug}/mesa/${num}`;

  const copyLink = async (num: number) => {
    await navigator.clipboard.writeText(getUrl(num));
    toast({ title: "Link copiado!" });
  };

  const handleAdd = async () => {
    const num = parseInt(tableNumber, 10);
    if (!num || num < 1) return;
    await addTable.mutateAsync({ number: num, label: tableLabel || undefined });
    setAddOpen(false);
    setTableNumber("");
    setTableLabel("");
  };

  const downloadQR = () => {
    if (!qrRef.current || !qrModal) return;
    const svg = qrRef.current;
    const xml = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([xml], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mesa-${qrModal.number}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };


  const tableLimitReached = tableLimit != null && tables.length >= tableLimit;

  return (
    <div className="space-y-5">
      <FirstAccessBanner
        tabKey="tables"
        title="Configure suas mesas! 🪑"
        description="Crie mesas e gere QR Codes para seus clientes fazerem pedidos pelo celular. Imprima e coloque sobre as mesas."
      />
      <CommandHeader
        eyebrow="Salão / Mesas"
        title="Mesas & Comandas"
        subtitle={`${tables.length} ${tables.length === 1 ? "mesa configurada" : "mesas configuradas"}${tableLimit != null ? ` de ${tableLimit}` : ""}`}
        icon={<Grid3X3 className="w-5 h-5" />}
        actions={
          <Button onClick={() => { if (tableLimitReached) { toast({ title: "Limite de mesas atingido", description: "Faça upgrade para criar mais mesas.", variant: "destructive" }); return; } setAddOpen(true); }} size="sm" className="gap-1.5 h-9" disabled={tableLimitReached}>
            <Plus className="w-4 h-4" /> Nova Mesa
          </Button>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <MetricTile label="Mesas cadastradas" value={tables.length} sub={tableLimit != null ? `limite ${tableLimit}` : "ilimitado"} />
        <MetricTile label="Capacidade" value={tableLimit ?? "∞"} />
        <MetricTile label="Slots restantes" value={tableLimit != null ? Math.max(0, tableLimit - tables.length) : "∞"} />
      </div>


      {/* Tables list */}
      {isLoading ? (
        <div className="cmd-panel p-6 text-muted-foreground text-sm animate-dashboard-fade-in dash-delay-1">Carregando mesas…</div>
      ) : tables.length === 0 ? (
        <CommandEmpty
          icon={<Grid3X3 className="w-7 h-7" />}
          title="Nenhuma mesa cadastrada"
          description="Crie mesas para gerar QR Codes e receber pedidos direto do celular do cliente."
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 animate-dashboard-fade-in dash-delay-1">
          {tables.map((t, idx) => (
            <div
              key={t.id}
              onClick={() => navigate(`/unidade/${organization.slug}/mesa/${t.number}`, { state: { from: "dashboard" } })}
              className="action-tile cursor-pointer group"
              style={{ animationDelay: `${(idx + 2) * 40}ms` }}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="section-eyebrow">Mesa</span>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="w-7 h-7" title="Ver QR Code" onClick={() => setQrModal({ number: t.number })}>
                    <QrCode className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="w-7 h-7" title="Copiar link" onClick={() => copyLink(t.number)}>
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="w-7 h-7 hover:text-destructive" title="Excluir mesa" onClick={() => setDeleteId(t.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
              <div className="font-display font-bold text-4xl text-foreground leading-none tracking-tight mt-1">{t.number}</div>
              <div className="text-xs text-muted-foreground truncate">{t.label || `/mesa/${t.number}`}</div>
            </div>
          ))}
        </div>
      )}

      {/* Add table modal */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Mesa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Número da mesa *</Label>
              <Input type="number" min={1} value={tableNumber} onChange={(e) => setTableNumber(e.target.value)} placeholder="Ex: 1" />
            </div>
            <div className="space-y-1.5">
              <Label>Nome personalizado (opcional)</Label>
              <Input value={tableLabel} onChange={(e) => setTableLabel(e.target.value)} placeholder="Ex: Mesa VIP, Varanda..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancelar</Button>
            <Button onClick={handleAdd} disabled={!tableNumber || addTable.isPending}>
              {addTable.isPending ? "Criando…" : "Criar Mesa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Code modal */}
      <Dialog open={!!qrModal} onOpenChange={() => setQrModal(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>QR Code — Mesa {qrModal?.number}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            {qrModal && (
              <>
                <div className="p-4 bg-white rounded-xl border border-border">
                  <QRCodeSVG ref={qrRef} value={getUrl(qrModal.number)} size={200} level="M" />
                </div>
                <p className="text-xs text-muted-foreground text-center break-all">{getUrl(qrModal.number)}</p>
              </>
            )}
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button variant="outline" className="w-full" onClick={() => qrModal && copyLink(qrModal.number)}>
              <Copy className="w-4 h-4 mr-2" /> Copiar Link
            </Button>
            <Button className="w-full" onClick={downloadQR}>Baixar QR Code (SVG)</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover mesa?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => { if (deleteId) await deleteTable.mutateAsync(deleteId); setDeleteId(null); }}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
