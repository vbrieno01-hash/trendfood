import { useState, useEffect, useRef } from "react";
import { usePlatformContentAdmin } from "@/hooks/usePlatformContent";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Save, Loader2, Globe, Type, Image, BadgeCheck, MessageCircle, Upload, Trash2, Plus, BarChart3, Zap, Layout, ArrowRight, Table } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { compressImage } from "@/lib/compressImage";

/* ── Reusable editors ── */

function FieldEditor({ label, icon, value, onChange, multiline = false }: {
  label: string; icon: React.ReactNode; value: string; onChange: (v: string) => void; multiline?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{icon} {label}</label>
      {multiline ? (
        <Textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} className="text-sm bg-muted/40 border-0" />
      ) : (
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="text-sm bg-muted/40 border-0" />
      )}
    </div>
  );
}

function ArrayEditor({ label, icon, items, onChange }: {
  label: string; icon: React.ReactNode; items: string[]; onChange: (items: string[]) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{icon} {label}</label>
      {items.map((item, i) => (
        <div key={i} className="flex gap-2">
          <Input value={item} onChange={(e) => { const c = [...items]; c[i] = e.target.value; onChange(c); }} className="text-sm bg-muted/40 border-0 flex-1" />
          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => onChange(items.filter((_, j) => j !== i))}>×</Button>
        </div>
      ))}
      <Button size="sm" variant="outline" onClick={() => onChange([...items, ""])}>+ Adicionar</Button>
    </div>
  );
}

function ImageUploader({ value, onChange, label }: { value: string; onChange: (url: string) => void; label: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    setUploading(true);
    try {
      // Apagar imagem antiga do storage
      if (value && value.includes("/site-images/")) {
        const oldPath = decodeURIComponent(value.split("/site-images/")[1]);
        await supabase.storage.from("site-images").remove([oldPath]);
      }

      const compressed = await compressImage(file, { maxWidth: 1920, quality: 0.85 });
      const ext = compressed.name.split(".").pop() || "webp";
      const path = `cms/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("site-images").upload(path, compressed, { cacheControl: "0", upsert: false });
      if (error) throw error;
      const { data: pub } = supabase.storage.from("site-images").getPublicUrl(path);
      onChange(pub.publicUrl);
      toast.success("Imagem enviada!");
    } catch (err: any) {
      toast.error("Erro no upload: " + err.message);
    }
    setUploading(false);
  }

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        <Image className="w-3 h-3" /> {label}
      </label>
      <div className="flex gap-2 items-center">
        <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="URL da imagem ou faça upload" className="text-sm bg-muted/40 border-0 flex-1" />
        <Button size="sm" variant="outline" disabled={uploading} onClick={() => ref.current?.click()} className="gap-1">
          {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
          Upload
        </Button>
        <input ref={ref} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
      </div>
      {value && (
        <div className="rounded-xl overflow-hidden border border-border h-28">
          <img src={value} alt="Preview" className="w-full h-full object-cover" />
        </div>
      )}
    </div>
  );
}

/* ── Card editors for arrays of objects ── */

function CardListEditor({ label, icon, items, onChange, fields }: {
  label: string; icon: React.ReactNode;
  items: Record<string, string>[];
  onChange: (items: Record<string, string>[]) => void;
  fields: { key: string; label: string; type: "text" | "textarea" | "image" }[];
}) {
  const addItem = () => {
    const blank: Record<string, string> = {};
    fields.forEach((f) => { blank[f.key] = ""; });
    onChange([...items, blank]);
  };
  const removeItem = (idx: number) => onChange(items.filter((_, i) => i !== idx));
  const updateItem = (idx: number, key: string, val: string) => {
    const copy = items.map((item, i) => i === idx ? { ...item, [key]: val } : item);
    onChange(copy);
  };

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{icon} {label}</label>
      {items.map((item, idx) => (
        <div key={idx} className="bg-muted/30 rounded-xl p-4 space-y-3 border border-border/50 relative">
          <Button size="icon" variant="ghost" className="absolute top-2 right-2 text-destructive h-7 w-7" onClick={() => removeItem(idx)}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
          <span className="text-xs font-bold text-muted-foreground">#{idx + 1}</span>
          {fields.map((f) => (
            f.type === "image" ? (
              <ImageUploader key={f.key} label={f.label} value={item[f.key] || ""} onChange={(v) => updateItem(idx, f.key, v)} />
            ) : (
              <FieldEditor key={f.key} label={f.label} icon={<Type className="w-3 h-3" />} value={item[f.key] || ""} onChange={(v) => updateItem(idx, f.key, v)} multiline={f.type === "textarea"} />
            )
          ))}
        </div>
      ))}
      <Button size="sm" variant="outline" onClick={addItem} className="gap-1"><Plus className="w-3 h-3" /> Adicionar Card</Button>
    </div>
  );
}

/* ── Main component ── */

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
      for (const key of Object.keys(fields)) {
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
      <div className="flex items-center justify-between sticky top-0 z-10 bg-background/80 backdrop-blur-sm py-3 -mt-3">
        <div>
          <h2 className="text-lg font-bold text-foreground">Site & Conteúdo</h2>
          <p className="text-sm text-muted-foreground">Edite textos, imagens e seções da landing page</p>
        </div>
        <Button onClick={handleSave} disabled={saving || !dirty} className="gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Salvar Tudo
        </Button>
      </div>

      {/* General Config */}
      <section className="admin-glass rounded-2xl p-6 space-y-4">
        <h3 className="font-bold text-foreground flex items-center gap-2"><MessageCircle className="w-4 h-4 text-primary" /> Configurações Gerais</h3>
        <FieldEditor label="WhatsApp de Suporte (com DDI)" icon={<MessageCircle className="w-3 h-3" />} value={str("support_whatsapp")} onChange={(v) => set("support_whatsapp", v)} />
        <FieldEditor label="Link da Comunidade WhatsApp (botão no painel)" icon={<MessageCircle className="w-3 h-3" />} value={str("community_whatsapp_url")} onChange={(v) => set("community_whatsapp_url", v)} />
        <FieldEditor label="Texto do Contador de Pedidos" icon={<Type className="w-3 h-3" />} value={str("order_counter_text")} onChange={(v) => set("order_counter_text", v)} />
      </section>

      {/* Hero Section */}
      <section className="admin-glass rounded-2xl p-6 space-y-4">
        <h3 className="font-bold text-foreground flex items-center gap-2"><Globe className="w-4 h-4 text-primary" /> Hero da Landing Page</h3>
        <FieldEditor label="Badge do Hero" icon={<BadgeCheck className="w-3 h-3" />} value={str("hero_badge_text")} onChange={(v) => set("hero_badge_text", v)} />
        <FieldEditor label="Título Principal" icon={<Type className="w-3 h-3" />} value={str("hero_title")} onChange={(v) => set("hero_title", v)} />
        <FieldEditor label="Título Destaque (gradiente)" icon={<Type className="w-3 h-3" />} value={str("hero_title_highlight")} onChange={(v) => set("hero_title_highlight", v)} />
        <FieldEditor label="Subtítulo" icon={<Type className="w-3 h-3" />} value={str("hero_subtitle")} onChange={(v) => set("hero_subtitle", v)} multiline />
        <FieldEditor label="Subtítulo Secundário" icon={<Type className="w-3 h-3" />} value={str("hero_subtitle2")} onChange={(v) => set("hero_subtitle2", v)} />
        <FieldEditor label="Texto do Botão CTA" icon={<Type className="w-3 h-3" />} value={str("hero_cta_text")} onChange={(v) => set("hero_cta_text", v)} />
        <ImageUploader label="Imagem de Fundo do Hero" value={str("hero_image_url")} onChange={(v) => set("hero_image_url", v)} />
      </section>

      {/* Proof Badges */}
      <section className="admin-glass rounded-2xl p-6 space-y-4">
        <h3 className="font-bold text-foreground flex items-center gap-2"><BadgeCheck className="w-4 h-4 text-primary" /> Badges de Prova Social</h3>
        <ArrayEditor label="Badges" icon={<BadgeCheck className="w-3 h-3" />} items={arr("proof_badges")} onChange={(v) => set("proof_badges", v)} />
      </section>

      {/* Benefit Cards */}
      <section className="admin-glass rounded-2xl p-6 space-y-4">
        <h3 className="font-bold text-foreground flex items-center gap-2"><Zap className="w-4 h-4 text-primary" /> Cards de Benefícios</h3>
        <CardListEditor
          label="Cards de Benefícios (abaixo do hero)"
          icon={<Zap className="w-3 h-3" />}
          items={arr("benefit_cards")}
          onChange={(v) => set("benefit_cards", v)}
          fields={[
            { key: "title", label: "Título", type: "text" },
            { key: "description", label: "Descrição", type: "textarea" },
          ]}
        />
      </section>

      {/* Problems Section */}
      <section className="admin-glass rounded-2xl p-6 space-y-4">
        <h3 className="font-bold text-foreground flex items-center gap-2"><Type className="w-4 h-4 text-primary" /> Seção de Problemas</h3>
        <FieldEditor label="Título da Seção" icon={<Type className="w-3 h-3" />} value={str("problems_title")} onChange={(v) => set("problems_title", v)} />
        <FieldEditor label="Subtítulo da Seção" icon={<Type className="w-3 h-3" />} value={str("problems_subtitle")} onChange={(v) => set("problems_subtitle", v)} />
        <CardListEditor
          label="Cards de Problemas"
          icon={<Image className="w-3 h-3" />}
          items={arr("problems_cards")}
          onChange={(v) => set("problems_cards", v)}
          fields={[
            { key: "image", label: "Imagem", type: "image" },
            { key: "title", label: "Título", type: "text" },
            { key: "description", label: "Descrição", type: "textarea" },
          ]}
        />
      </section>

      {/* How it works */}
      <section className="admin-glass rounded-2xl p-6 space-y-4">
        <h3 className="font-bold text-foreground flex items-center gap-2"><Layout className="w-4 h-4 text-primary" /> Como Funciona (Passos)</h3>
        <CardListEditor
          label="Passos"
          icon={<Layout className="w-3 h-3" />}
          items={arr("steps_cards")}
          onChange={(v) => set("steps_cards", v)}
          fields={[
            { key: "title", label: "Título", type: "text" },
            { key: "description", label: "Descrição", type: "textarea" },
          ]}
        />
      </section>

      {/* Features */}
      <section className="admin-glass rounded-2xl p-6 space-y-4">
        <h3 className="font-bold text-foreground flex items-center gap-2"><BarChart3 className="w-4 h-4 text-primary" /> Funcionalidades</h3>
        <CardListEditor
          label="Cards de Funcionalidades"
          icon={<BarChart3 className="w-3 h-3" />}
          items={arr("features_cards")}
          onChange={(v) => set("features_cards", v)}
          fields={[
            { key: "title", label: "Título", type: "text" },
            { key: "description", label: "Descrição", type: "textarea" },
          ]}
        />
      </section>

      {/* Comparison */}
      <section className="admin-glass rounded-2xl p-6 space-y-4">
        <h3 className="font-bold text-foreground flex items-center gap-2"><Table className="w-4 h-4 text-primary" /> Comparativo (TrendFood vs Marketplace)</h3>
        <CardListEditor
          label="Linhas do Comparativo"
          icon={<Table className="w-3 h-3" />}
          items={arr("comparison_rows")}
          onChange={(v) => set("comparison_rows", v)}
          fields={[
            { key: "label", label: "Critério", type: "text" },
            { key: "marketplace", label: "Marketplace", type: "text" },
            { key: "trendfood", label: "TrendFood", type: "text" },
            { key: "badge", label: "Badge (opcional)", type: "text" },
          ]}
        />
      </section>

      {/* CTA Final */}
      <section className="admin-glass rounded-2xl p-6 space-y-4">
        <h3 className="font-bold text-foreground flex items-center gap-2"><ArrowRight className="w-4 h-4 text-primary" /> CTA Final</h3>
        <FieldEditor label="Título" icon={<Type className="w-3 h-3" />} value={str("cta_title")} onChange={(v) => set("cta_title", v)} />
        <FieldEditor label="Subtítulo" icon={<Type className="w-3 h-3" />} value={str("cta_subtitle")} onChange={(v) => set("cta_subtitle", v)} multiline />
        <FieldEditor label="Texto do Botão" icon={<Type className="w-3 h-3" />} value={str("cta_button_text")} onChange={(v) => set("cta_button_text", v)} />
      </section>

      {/* Footer */}
      <section className="admin-glass rounded-2xl p-6 space-y-4">
        <h3 className="font-bold text-foreground flex items-center gap-2"><Globe className="w-4 h-4 text-primary" /> Footer</h3>
        <FieldEditor label="Descrição do Footer" icon={<Type className="w-3 h-3" />} value={str("footer_description")} onChange={(v) => set("footer_description", v)} multiline />
        <FieldEditor label="Link Instagram" icon={<Globe className="w-3 h-3" />} value={str("footer_instagram_url")} onChange={(v) => set("footer_instagram_url", v)} />
        <FieldEditor label="Link WhatsApp" icon={<MessageCircle className="w-3 h-3" />} value={str("footer_whatsapp_url")} onChange={(v) => set("footer_whatsapp_url", v)} />
        <FieldEditor label="Email de Contato" icon={<MessageCircle className="w-3 h-3" />} value={str("footer_email")} onChange={(v) => set("footer_email", v)} />
        <FieldEditor label="Texto de Copyright" icon={<Type className="w-3 h-3" />} value={str("footer_copyright")} onChange={(v) => set("footer_copyright", v)} />
      </section>
    </div>
  );
}
