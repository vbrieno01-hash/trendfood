import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Building2 } from "lucide-react";

interface CreateUnitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onCreated: () => Promise<void>;
}

function toSlug(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export default function CreateUnitDialog({ open, onOpenChange, userId, onCreated }: CreateUnitDialogProps) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [saving, setSaving] = useState(false);

  const handleNameChange = (val: string) => {
    setName(val);
    setSlug(toSlug(val));
  };

  const handleSave = async () => {
    if (!name.trim() || !slug.trim()) {
      toast.error("Preencha o nome da unidade.");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("organizations").insert({
        name: name.trim(),
        slug: slug.trim(),
        user_id: userId,
        whatsapp: whatsapp.trim() || null,
      });
      if (error) {
        if (error.code === "23505") {
          toast.error("Esse slug já está em uso. Escolha outro.");
        } else {
          toast.error("Erro ao criar unidade: " + error.message);
        }
        return;
      }
      toast.success("Nova unidade criada com sucesso!");
      setName("");
      setSlug("");
      setWhatsapp("");
      onOpenChange(false);
      await onCreated();
    } catch {
      toast.error("Erro inesperado ao criar unidade.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            Criar nova unidade
          </DialogTitle>
          <DialogDescription>
            Cada unidade terá seu próprio cardápio, mesas, pedidos e caixa separados.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="unit-name">Nome da unidade</Label>
            <Input
              id="unit-name"
              placeholder="Ex: Loja Centro"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="unit-slug">Slug (URL)</Label>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <span>/unidade/</span>
              <Input
                id="unit-slug"
                value={slug}
                onChange={(e) => setSlug(toSlug(e.target.value))}
                className="flex-1"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="unit-whatsapp">WhatsApp (opcional)</Label>
            <Input
              id="unit-whatsapp"
              placeholder="5511999999999"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Criando..." : "Criar unidade"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
