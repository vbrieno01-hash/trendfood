import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Upload, Trash2, Image as ImageIcon } from "lucide-react";
import {
  Home, UtensilsCrossed, TableProperties, History, Tag,
  BarChart2, Flame, BellRing, Wallet, Store, Settings, Plus, Truck,
} from "lucide-react";
import { compressImage } from "@/lib/compressImage";

interface GuideSection {
  id: string;
  icon: React.ReactNode;
  title: string;
}

const SECTIONS: GuideSection[] = [
  { id: "home", icon: <Home className="w-4 h-4" />, title: "Home" },
  { id: "menu", icon: <UtensilsCrossed className="w-4 h-4" />, title: "Meu Cardápio" },
  { id: "addons", icon: <Plus className="w-4 h-4" />, title: "Adicionais / Complementos" },
  { id: "tables", icon: <TableProperties className="w-4 h-4" />, title: "Mesas" },
  { id: "history", icon: <History className="w-4 h-4" />, title: "Histórico de Pedidos" },
  { id: "coupons", icon: <Tag className="w-4 h-4" />, title: "Cupons de Desconto" },
  { id: "bestsellers", icon: <BarChart2 className="w-4 h-4" />, title: "Mais Vendidos" },
  { id: "kitchen", icon: <Flame className="w-4 h-4" />, title: "Cozinha / KDS" },
  { id: "waiter", icon: <BellRing className="w-4 h-4" />, title: "Painel do Garçom" },
  { id: "caixa", icon: <Wallet className="w-4 h-4" />, title: "Controle de Caixa" },
  { id: "delivery", icon: <Truck className="w-4 h-4" />, title: "Frete e Entrega" },
  { id: "profile", icon: <Store className="w-4 h-4" />, title: "Perfil da Loja" },
  { id: "settings", icon: <Settings className="w-4 h-4" />, title: "Configurações" },
];

export default function AdminGuideTab() {
  const [screenshots, setScreenshots] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("guide_screenshots")
      .select("section_id, image_url")
      .then(({ data }) => {
        const map: Record<string, string> = {};
        (data ?? []).forEach((r: any) => { map[r.section_id] = r.image_url; });
        setScreenshots(map);
        setLoading(false);
      });
  }, []);

  async function handleUpload(sectionId: string, file: File) {
    setUploading(sectionId);
    try {
      const compressed = await compressImage(file);
      const ext = file.name.split(".").pop() || "png";
      const path = `${sectionId}.${ext}`;

      // Delete old file if exists
      await supabase.storage.from("guide-images").remove([path]);

      const { error: uploadErr } = await supabase.storage
        .from("guide-images")
        .upload(path, compressed, { upsert: true });
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from("guide-images").getPublicUrl(path);
      const imageUrl = urlData.publicUrl + "?t=" + Date.now();

      // Upsert in guide_screenshots
      const { error: dbErr } = await supabase
        .from("guide_screenshots")
        .upsert({ section_id: sectionId, image_url: imageUrl, updated_at: new Date().toISOString() }, { onConflict: "section_id" });
      if (dbErr) throw dbErr;

      setScreenshots((prev) => ({ ...prev, [sectionId]: imageUrl }));
      toast.success("Imagem atualizada!");
    } catch (err: any) {
      toast.error("Erro ao fazer upload: " + (err.message || ""));
    } finally {
      setUploading(null);
    }
  }

  async function handleDelete(sectionId: string) {
    setUploading(sectionId);
    try {
      // Try to remove common extensions
      await supabase.storage.from("guide-images").remove([
        `${sectionId}.png`, `${sectionId}.jpg`, `${sectionId}.jpeg`, `${sectionId}.webp`,
      ]);
      await supabase.from("guide_screenshots").delete().eq("section_id", sectionId);
      setScreenshots((prev) => {
        const copy = { ...prev };
        delete copy[sectionId];
        return copy;
      });
      toast.success("Imagem removida!");
    } catch {
      toast.error("Erro ao remover imagem");
    } finally {
      setUploading(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-lg font-bold text-foreground">Screenshots do Guia</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Faça upload de screenshots para cada seção do guia. As imagens aparecerão para os usuários automaticamente.
        </p>
      </div>

      <div className="space-y-3">
        {SECTIONS.map((section) => (
          <SectionRow
            key={section.id}
            section={section}
            imageUrl={screenshots[section.id]}
            uploading={uploading === section.id}
            onUpload={(file) => handleUpload(section.id, file)}
            onDelete={() => handleDelete(section.id)}
          />
        ))}
      </div>
    </div>
  );
}

function AdminThumb({ src, alt }: { src: string; alt: string }) {
  const [error, setError] = useState(false);
  if (error) {
    return (
      <div className="w-16 h-10 rounded-md border border-border bg-muted flex items-center justify-center">
        <ImageIcon className="w-4 h-4 text-muted-foreground" />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      className="w-16 h-10 object-cover rounded-md border border-border"
      onError={() => setError(true)}
    />
  );
}

function SectionRow({
  section,
  imageUrl,
  uploading,
  onUpload,
  onDelete,
}: {
  section: GuideSection;
  imageUrl?: string;
  uploading: boolean;
  onUpload: (file: File) => void;
  onDelete: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
        {section.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{section.title}</p>
      </div>

      {imageUrl ? (
        <div className="flex items-center gap-2">
          <AdminThumb src={imageUrl} alt={section.title} />
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="text-xs px-2.5 py-1.5 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors disabled:opacity-50"
          >
            {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
          </button>
          <button
            onClick={onDelete}
            disabled={uploading}
            className="text-xs px-2.5 py-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
        >
          {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <ImageIcon className="w-3 h-3" />}
          Upload
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
