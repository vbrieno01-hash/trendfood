import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, Download, Smartphone, Monitor, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function AdminDownloadsSection() {
  const [apkUrl, setApkUrl] = useState<string | null>(null);
  const [exeUrl, setExeUrl] = useState<string | null>(null);
  const [apkLoading, setApkLoading] = useState(false);
  const [exeLoading, setExeLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const apkRef = useRef<HTMLInputElement>(null);
  const exeRef = useRef<HTMLInputElement>(null);

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
    <section className="animate-admin-fade-in admin-delay-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-xl bg-violet-500/15 flex items-center justify-center">
          <Download className="w-4 h-4 text-violet-600 dark:text-violet-400" />
        </div>
        <h2 className="text-sm font-bold text-foreground">Downloads Globais (APK / EXE)</h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* APK Card */}
        <div className="admin-glass rounded-2xl p-5 space-y-3 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/15 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
              <Smartphone className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">App Android</p>
              <p className="text-[11px] text-muted-foreground">.apk</p>
            </div>
            {apkUrl && (
              <div className="ml-auto flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-[11px] font-semibold">Disponível</span>
              </div>
            )}
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
              className="h-9 gap-2 flex-1 rounded-xl hover:scale-105 transition-transform"
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
                className="h-9 gap-2 rounded-xl hover:scale-105 transition-transform"
                onClick={() => window.open(apkUrl, "_blank", "noopener,noreferrer")}
              >
                <Download className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* EXE Card */}
        <div className="admin-glass rounded-2xl p-5 space-y-3 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-blue-500/15 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
              <Monitor className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Programa Desktop</p>
              <p className="text-[11px] text-muted-foreground">.exe</p>
            </div>
            {exeUrl && (
              <div className="ml-auto flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-[11px] font-semibold">Disponível</span>
              </div>
            )}
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
              className="h-9 gap-2 flex-1 rounded-xl hover:scale-105 transition-transform"
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
                className="h-9 gap-2 rounded-xl hover:scale-105 transition-transform"
                onClick={() => window.open(exeUrl, "_blank", "noopener,noreferrer")}
              >
                <Download className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
