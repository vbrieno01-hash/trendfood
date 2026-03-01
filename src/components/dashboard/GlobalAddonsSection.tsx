import { useState } from "react";
import { Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  useAllGlobalAddons, useAddGlobalAddon, useUpdateGlobalAddon, useDeleteGlobalAddon,
} from "@/hooks/useGlobalAddonsCrud";

interface Props {
  organizationId: string;
}

export default function GlobalAddonsSection({ organizationId }: Props) {
  const { data: addons = [], isLoading } = useAllGlobalAddons(organizationId);
  const addAddon = useAddGlobalAddon();
  const updateAddon = useUpdateGlobalAddon();
  const deleteAddon = useDeleteGlobalAddon();
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState(0);
  const [open, setOpen] = useState(false);

  const handleAdd = () => {
    if (!newName.trim()) return;
    addAddon.mutate(
      { organization_id: organizationId, name: newName.trim(), price_cents: Math.round(newPrice * 100) },
      { onSuccess: () => { setNewName(""); setNewPrice(0); } },
    );
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/40 transition-colors">
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">
                Adicionais fixos (todos os produtos)
              </span>
              <span className="text-xs text-muted-foreground">
                ({addons.length})
              </span>
            </div>
            {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
            {isLoading && (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            )}

            {addons.length > 0 && (
              <div className="space-y-1">
                {addons.map((a) => (
                  <div key={a.id} className="flex items-center gap-2 text-sm bg-secondary/50 rounded px-2.5 py-1.5">
                    <Switch
                      checked={a.available}
                      onCheckedChange={(v) => updateAddon.mutate({ id: a.id, organizationId, available: v })}
                      className="scale-75"
                    />
                    <span className="flex-1 text-foreground truncate">{a.name}</span>
                    <span className="text-muted-foreground text-xs tabular-nums whitespace-nowrap">
                      +R$ {(a.price_cents / 100).toFixed(2).replace(".", ",")}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="w-6 h-6 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteAddon.mutate({ id: a.id, organizationId })}
                      disabled={deleteAddon.isPending}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Label className="text-xs">Nome</Label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex: Bacon extra"
                  className="h-9"
                />
              </div>
              <div className="w-28">
                <Label className="text-xs">Preço</Label>
                <CurrencyInput
                  value={newPrice}
                  onChange={setNewPrice}
                  className="h-9"
                />
              </div>
              <Button
                type="button"
                size="sm"
                className="h-9 gap-1"
                onClick={handleAdd}
                disabled={!newName.trim() || addAddon.isPending}
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Esses adicionais aparecem em todos os produtos do cardápio.
            </p>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
