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
import {
  Copy, Trash2, QrCode, ExternalLink, UtensilsCrossed, ChefHat, Grid3X3, Plus,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props { organization: Organization }

export default function TablesTab({ organization }: Props) {
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

  const PRODUCTION_URL = "https://snack-hive.lovable.app";
  const getUrl = (num: number) => `${PRODUCTION_URL}/unidade/${organization.slug}/mesa/${num}`;

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

  const kitchenUrl = `/cozinha?org=${organization.slug}`;
  const waiterUrl = `/garcom?org=${organization.slug}`;

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Mesas</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {tables.length} {tables.length === 1 ? "mesa configurada" : "mesas configuradas"}
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)} size="sm" className="gap-1.5 h-9">
          <Plus className="w-4 h-4" />
          Nova Mesa
        </Button>
      </div>

      {/* Quick links — com fundo colorido sutil */}
      <div className="grid grid-cols-2 gap-3">
        <a
          href={kitchenUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 px-4 py-3 rounded-xl border border-orange-200 bg-orange-50 hover:bg-orange-100 transition-colors text-sm font-medium text-orange-800"
        >
          <ChefHat className="w-4 h-4 text-orange-500 shrink-0" />
          <span className="flex-1">Painel da Cozinha</span>
          <ExternalLink className="w-3.5 h-3.5 text-orange-400" />
        </a>
        <a
          href={waiterUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 px-4 py-3 rounded-xl border border-green-200 bg-green-50 hover:bg-green-100 transition-colors text-sm font-medium text-green-800"
        >
          <UtensilsCrossed className="w-4 h-4 text-green-500 shrink-0" />
          <span className="flex-1">Painel do Garçom</span>
          <ExternalLink className="w-3.5 h-3.5 text-green-400" />
        </a>
      </div>

      {/* Tables list */}
      {isLoading ? (
        <div className="text-muted-foreground text-sm">Carregando mesas…</div>
      ) : tables.length === 0 ? (
        <div className="text-center py-14 border border-dashed border-border rounded-xl">
          <Grid3X3 className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="font-semibold text-foreground text-sm">Nenhuma mesa cadastrada</p>
          <p className="text-muted-foreground text-xs mt-1">
            Crie mesas para gerar QR Codes e receber pedidos.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
          {tables.map((t) => (
            <div
              key={t.id}
              onClick={() => navigate(`/unidade/${organization.slug}/mesa/${t.number}`, { state: { from: "dashboard" } })}
              className="flex items-center gap-3 px-4 py-3 bg-card hover:bg-secondary/40 transition-colors cursor-pointer"
            >
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center font-bold text-primary text-sm shrink-0">
                {t.number}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-foreground">
                  Mesa {t.number}{t.label ? ` — ${t.label}` : ""}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  /unidade/{organization.slug}/mesa/{t.number}
                </p>
              </div>
              <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="w-8 h-8" title="Ver QR Code" onClick={() => setQrModal({ number: t.number })}>
                  <QrCode className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="w-8 h-8" title="Copiar link" onClick={() => copyLink(t.number)}>
                  <Copy className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="w-8 h-8 hover:text-destructive" title="Excluir mesa" onClick={() => setDeleteId(t.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
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
