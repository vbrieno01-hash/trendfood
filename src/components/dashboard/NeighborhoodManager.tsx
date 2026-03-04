import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  useAllDeliveryNeighborhoods,
  useAddNeighborhood,
  useUpdateNeighborhood,
  useDeleteNeighborhood,
} from "@/hooks/useDeliveryNeighborhoods";

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export default function NeighborhoodManager({ organizationId }: { organizationId: string }) {
  const { data: neighborhoods = [], isLoading } = useAllDeliveryNeighborhoods(organizationId);
  const addMutation = useAddNeighborhood();
  const updateMutation = useUpdateNeighborhood();
  const deleteMutation = useDeleteNeighborhood();

  const [newName, setNewName] = useState("");
  const [newFee, setNewFee] = useState("");

  const handleAdd = () => {
    const name = newName.trim();
    if (!name) { toast.error("Digite o nome do bairro"); return; }
    const fee = parseFloat(newFee) || 0;
    addMutation.mutate(
      { organization_id: organizationId, name, fee },
      {
        onSuccess: () => {
          toast.success(`Bairro "${name}" adicionado!`);
          setNewName("");
          setNewFee("");
        },
        onError: (err: any) => {
          if (err?.message?.includes("duplicate")) {
            toast.error("Esse bairro já existe.");
          } else {
            toast.error("Erro ao adicionar bairro.");
          }
        },
      }
    );
  };

  const handleUpdateFee = (id: string, fee: number) => {
    updateMutation.mutate({ id, fee });
  };

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Remover o bairro "${name}"?`)) return;
    deleteMutation.mutate(id, {
      onSuccess: () => toast.success(`Bairro "${name}" removido.`),
      onError: () => toast.error("Erro ao remover bairro."),
    });
  };

  if (isLoading) {
    return (
      <div className="mt-4 flex items-center gap-2 text-muted-foreground text-sm">
        <Loader2 className="w-4 h-4 animate-spin" /> Carregando bairros...
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Bairros atendidos e Taxas
      </p>

      {/* Existing neighborhoods */}
      {neighborhoods.length > 0 && (
        <div className="space-y-2">
          {neighborhoods.map((n) => (
            <div key={n.id} className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground flex-1 truncate">{n.name}</span>
              <div className="relative w-24">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                <Input
                  type="number"
                  min={0}
                  step={0.5}
                  defaultValue={n.fee}
                  onBlur={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    if (val !== n.fee) handleUpdateFee(n.id, val);
                  }}
                  className="pl-8 h-8 text-sm"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                onClick={() => handleDelete(n.id, n.name)}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {neighborhoods.length === 0 && (
        <p className="text-sm text-muted-foreground italic">
          Nenhum bairro cadastrado. Adicione abaixo os bairros que você atende.
        </p>
      )}

      {/* Add new */}
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Label className="text-xs font-medium mb-1 block">Novo bairro</Label>
          <Input
            placeholder="Ex: Centro"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="h-9"
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
        </div>
        <div className="w-24">
          <Label className="text-xs font-medium mb-1 block">Taxa (R$)</Label>
          <Input
            type="number"
            min={0}
            step={0.5}
            placeholder="5.00"
            value={newFee}
            onChange={(e) => setNewFee(e.target.value)}
            className="h-9"
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
        </div>
        <Button
          type="button"
          size="sm"
          className="h-9 gap-1.5"
          onClick={handleAdd}
          disabled={addMutation.isPending}
        >
          {addMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          Adicionar
        </Button>
      </div>

      {/* Preview */}
      {neighborhoods.length > 0 && (
        <div className="bg-secondary/60 rounded-xl p-3 text-xs space-y-1">
          <p className="font-semibold text-foreground mb-1">Preview para o cliente:</p>
          {neighborhoods.filter(n => n.active).map((n) => (
            <p key={n.id} className="text-muted-foreground">
              📍 <strong>{n.name}</strong> → <strong className="text-foreground">{fmt(n.fee)}</strong>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
