import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, Download, Smartphone, Monitor } from "lucide-react";
import { toast } from "sonner";

export default function AdminDownloadsSection() {
  const [apkUrl, setApkUrl] = useState<string | null>(null);
  const [exeUrl, setExeUrl] = useState<string | null>(null);
  const [apkLoading, setApkLoading] = useState(false);
  const [exeLoading, setExeLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const apkRef = useRef<HTMLInputElement>(null);
  const exeRef = useRef<HTMLInputElement>(null);

  // Load current URLs from platform_config
  useState(() => {
    supabase
      .from("platform_config")
      .select("apk_url, exe_url")
      .eq("id", "singleton")
      .single()
      .then(({ data }) => {
        if (data) {
          setApkUrl((data as any).apk_url || null);
          setExeUrl((data as any).exe_url || null);
        }
        setLoaded(true);
      });
  });

  const handleUpload = async (
    file: File,
    type: "apk" | "exe",
    setLoading: (v: boolean) => void,
    setUrl: (url: string | null) => void
  ) => {
    setLoading(true);
    try {
      const ext = type === "apk" ? ".apk" : ".exe";
      const path = `global/trendfood${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("downloads")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("downloads")
        .getPublicUrl(path);

      const publicUrl = urlData.publicUrl;
      const col = type === "apk" ? "apk_url" : "exe_url";

      const { error: dbError } = await supabase
        .from("platform_config")
        .update({ [col]: publicUrl } as any)
        .eq("id", "singleton");
      if (dbError) throw dbError;

      setUrl(publicUrl);
      toast.success(`${type.toUpperCase()} enviado com sucesso!`);
    } catch (err: any) {
      console.error(err);
      toast.error(`Erro ao enviar ${type.toUpperCase()}: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!loaded) return null;

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-secondary/30 flex items-center gap-2">
        <Download className="w-3.5 h-3.5 text-muted-foreground" />
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Downloads Globais (APK / EXE)
        </p>
      </div>
      <div className="px-4 py-4 grid gap-3 sm:grid-cols-2">
        {/* APK */}
        <div className="rounded-lg border border-border p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">App Android (.apk)</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Envie o APK que ficará disponível para todas as lojas baixarem.
          </p>
          <input
            type="file"
            accept=".apk"
            className="hidden"
            ref={apkRef}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleUpload(f, "apk", setApkLoading, setApkUrl);
              e.target.value = "";
            }}
          />
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-2 flex-1"
              disabled={apkLoading}
              onClick={() => apkRef.current?.click()}
            >
              {apkLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {apkLoading ? "Enviando..." : "Enviar APK"}
            </Button>
            {apkUrl && (
              <Button
                variant="secondary"
                size="sm"
                className="h-9 gap-2"
                onClick={() => window.open(apkUrl, "_blank", "noopener,noreferrer")}
              >
                <Download className="w-4 h-4" />
              </Button>
            )}
          </div>
          {apkUrl && <p className="text-xs text-green-600">✓ APK disponível</p>}
        </div>

        {/* EXE */}
        <div className="rounded-lg border border-border p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Monitor className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Programa Desktop (.exe)</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Envie o EXE que ficará disponível para todas as lojas baixarem.
          </p>
          <input
            type="file"
            accept=".exe"
            className="hidden"
            ref={exeRef}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleUpload(f, "exe", setExeLoading, setExeUrl);
              e.target.value = "";
            }}
          />
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-2 flex-1"
              disabled={exeLoading}
              onClick={() => exeRef.current?.click()}
            >
              {exeLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {exeLoading ? "Enviando..." : "Enviar EXE"}
            </Button>
            {exeUrl && (
              <Button
                variant="secondary"
                size="sm"
                className="h-9 gap-2"
                onClick={() => window.open(exeUrl, "_blank", "noopener,noreferrer")}
              >
                <Download className="w-4 h-4" />
              </Button>
            )}
          </div>
          {exeUrl && <p className="text-xs text-green-600">✓ EXE disponível</p>}
        </div>
      </div>
    </div>
  );
}
