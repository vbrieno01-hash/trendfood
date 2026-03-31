import { useState, useEffect } from "react";
import { usePlatformContentAdmin } from "@/hooks/usePlatformContent";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Save, Loader2, Globe, Type, Image, BadgeCheck, MessageCircle } from "lucide-react";

function FieldEditor({ label, icon, value, onChange, multiline = false }: {
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {icon} {label}
      </label>
      {multiline ? (
        <Textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} className="text-sm bg-muted/40 border-0" />
      ) : (
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="text-sm bg-muted/40 border-0" />
      )}
    </div>
  );
}

function ArrayEditor({ label, icon, items, onChange }: {
  label: string;
  icon: React.ReactNode;
  items: string[];
  onChange: (items: string[]) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {icon} {label}
      </label>
      {items.map((item, i) => (
        <div key={i} className="flex gap-2">
          <Input
            value={item}
            onChange={(e) => {
              const copy = [...items];
              copy[i] = e.target.value;
              onChange(copy);
            }}
            className="text-sm bg-muted/40 border-0 flex-1"
          />
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={() => onChange(items.filter((_, j) => j !== i))}
          >
            ×
          </Button>
        </div>
      ))}
      <Button size="sm" variant="outline" onClick={() => onChange([...items, ""])}>
        + Adicionar
      </Button>
    </div>
  );
}

export default function SiteContentTab() {
  const { rows, loading, upsert } = usePlatformContentAdmin();
  const [fields, setFields] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (rows.length) {
      const map: Record<string, any> = {};
      rows.forEach((r) => { map[r.key] = r.value; });
      setFields(map);
    }
  }, [rows]);

  function set(key: string, value: any) {
    setFields((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const keys = Object.keys(fields);
      for (const key of keys) {
        await upsert(key, fields[key]);
      }
      setDirty(false);
      toast.success("Conteúdo salvo com sucesso!");
    } catch {
      toast.error("Erro ao salvar");
    }
    setSaving(false);
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );

  const str = (key: string) => (typeof fields[key] === "string" ? fields[key] : (fields[key] ?? ""));
  const arr = (key: string) => (Array.isArray(fields[key]) ? fields[key] : []);

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Save button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Site & Conteúdo</h2>
          <p className="text-sm text-muted-foreground">Edite os textos da landing page e configurações gerais</p>
        </div>
        <Button onClick={handleSave} disabled={saving || !dirty} className="gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Salvar Tudo
        </Button>
      </div>

      {/* General Config */}
      <section className="admin-glass rounded-2xl p-6 space-y-4">
        <h3 className="font-bold text-foreground flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-primary" /> Configurações Gerais
        </h3>
        <FieldEditor
          label="WhatsApp de Suporte (com DDI)"
          icon={<MessageCircle className="w-3 h-3" />}
          value={str("support_whatsapp")}
          onChange={(v) => set("support_whatsapp", v)}
        />
        <FieldEditor
          label="Texto do Contador de Pedidos"
          icon={<Type className="w-3 h-3" />}
          value={str("order_counter_text")}
          onChange={(v) => set("order_counter_text", v)}
        />
      </section>

      {/* Hero Section */}
      <section className="admin-glass rounded-2xl p-6 space-y-4">
        <h3 className="font-bold text-foreground flex items-center gap-2">
          <Globe className="w-4 h-4 text-primary" /> Hero da Landing Page
        </h3>
        <FieldEditor
          label="Badge do Hero"
          icon={<BadgeCheck className="w-3 h-3" />}
          value={str("hero_badge_text")}
          onChange={(v) => set("hero_badge_text", v)}
        />
        <FieldEditor
          label="Título Principal"
          icon={<Type className="w-3 h-3" />}
          value={str("hero_title")}
          onChange={(v) => set("hero_title", v)}
        />
        <FieldEditor
          label="Título Destaque (gradiente)"
          icon={<Type className="w-3 h-3" />}
          value={str("hero_title_highlight")}
          onChange={(v) => set("hero_title_highlight", v)}
        />
        <FieldEditor
          label="Subtítulo"
          icon={<Type className="w-3 h-3" />}
          value={str("hero_subtitle")}
          onChange={(v) => set("hero_subtitle", v)}
          multiline
        />
        <FieldEditor
          label="Subtítulo Secundário"
          icon={<Type className="w-3 h-3" />}
          value={str("hero_subtitle2")}
          onChange={(v) => set("hero_subtitle2", v)}
        />
        <FieldEditor
          label="Texto do Botão CTA"
          icon={<Type className="w-3 h-3" />}
          value={str("hero_cta_text")}
          onChange={(v) => set("hero_cta_text", v)}
        />
        <FieldEditor
          label="URL da Imagem de Fundo"
          icon={<Image className="w-3 h-3" />}
          value={str("hero_image_url")}
          onChange={(v) => set("hero_image_url", v)}
        />
        {str("hero_image_url") && (
          <div className="rounded-xl overflow-hidden border border-border h-32">
            <img src={str("hero_image_url")} alt="Preview" className="w-full h-full object-cover" />
          </div>
        )}
      </section>

      {/* Proof Badges */}
      <section className="admin-glass rounded-2xl p-6 space-y-4">
        <h3 className="font-bold text-foreground flex items-center gap-2">
          <BadgeCheck className="w-4 h-4 text-primary" /> Badges de Prova Social
        </h3>
        <ArrayEditor
          label="Badges"
          icon={<BadgeCheck className="w-3 h-3" />}
          items={arr("proof_badges")}
          onChange={(v) => set("proof_badges", v)}
        />
      </section>

      {/* Problems Section */}
      <section className="admin-glass rounded-2xl p-6 space-y-4">
        <h3 className="font-bold text-foreground flex items-center gap-2">
          <Type className="w-4 h-4 text-primary" /> Seção de Problemas
        </h3>
        <FieldEditor
          label="Título da Seção"
          icon={<Type className="w-3 h-3" />}
          value={str("problems_title")}
          onChange={(v) => set("problems_title", v)}
        />
        <FieldEditor
          label="Subtítulo da Seção"
          icon={<Type className="w-3 h-3" />}
          value={str("problems_subtitle")}
          onChange={(v) => set("problems_subtitle", v)}
        />
      </section>
    </div>
  );
}
