import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Activity,
  Smartphone,
  Globe,
  Download,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { sendVersionHeartbeat } from "@/hooks/useVersionHeartbeat";
import { useAuth } from "@/hooks/useAuth";

interface HeartbeatRow {
  organization_id: string;
  version: string;
  user_agent: string | null;
  is_standalone: boolean;
  last_seen_at: string;
  org_name: string;
  org_slug: string;
  org_plan: string;
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `há ${d}d`;
  const m = Math.floor(d / 30);
  return `há ${m}mes${m > 1 ? "es" : ""}`;
}

type VersionStatus = "current" | "behind" | "outdated";

function classifyVersion(
  version: string,
  latest: string,
  sortedVersions: string[],
  lastSeenIso: string,
): VersionStatus {
  const daysSince = (Date.now() - new Date(lastSeenIso).getTime()) / (1000 * 60 * 60 * 24);
  if (daysSince > 7) return "outdated";
  if (version === latest) return "current";
  const idx = sortedVersions.indexOf(version);
  const latestIdx = sortedVersions.indexOf(latest);
  // sortedVersions é desc → latest está em idx 0
  const distance = idx - latestIdx;
  if (distance > 3 || idx === -1) return "outdated";
  return "behind";
}

function downloadCSV(content: string, filename: string) {
  const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function StoreVersionsTab() {
  const { organization } = useAuth();
  const [rows, setRows] = useState<HeartbeatRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [onlyOutdated, setOnlyOutdated] = useState(false);
  const [onlyPwa, setOnlyPwa] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [forcing, setForcing] = useState(false);

  async function handleForceHeartbeat() {
    if (!organization?.id) {
      toast.error("Você precisa ter uma loja vinculada à sua conta para enviar heartbeat.");
      return;
    }
    setForcing(true);
    const result = await sendVersionHeartbeat(organization.id);
    setForcing(false);
    if (result.ok) {
      toast.success(`Heartbeat enviado: ${result.version}`);
      setRefreshKey((k) => k + 1);
    } else {
      toast.error(`Falhou: ${result.error ?? "erro desconhecido"}`);
    }
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const { data: heartbeats, error } = await (supabase
        .from("store_version_heartbeat") as any)
        .select("organization_id, version, user_agent, is_standalone, last_seen_at")
        .order("last_seen_at", { ascending: false });

      if (error) {
        console.error("[versions] erro:", error);
        toast.error("Erro ao carregar heartbeats");
        if (!cancelled) setLoading(false);
        return;
      }

      const orgIds = (heartbeats ?? []).map((h: any) => h.organization_id);
      if (orgIds.length === 0) {
        if (!cancelled) {
          setRows([]);
          setLoading(false);
        }
        return;
      }

      const { data: orgs } = await supabase
        .from("organizations")
        .select("id, name, slug, subscription_plan")
        .in("id", orgIds);

      const orgMap = new Map(
        (orgs ?? []).map((o) => [o.id, o] as const),
      );

      const merged: HeartbeatRow[] = (heartbeats ?? [])
        .map((h: any) => {
          const org = orgMap.get(h.organization_id);
          if (!org) return null;
          return {
            organization_id: h.organization_id,
            version: h.version,
            user_agent: h.user_agent,
            is_standalone: !!h.is_standalone,
            last_seen_at: h.last_seen_at,
            org_name: org.name,
            org_slug: org.slug,
            org_plan: org.subscription_plan ?? "free",
          };
        })
        .filter(Boolean) as HeartbeatRow[];

      if (!cancelled) {
        setRows(merged);
        setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const sortedVersions = useMemo(() => {
    const set = new Set(rows.map((r) => r.version));
    return [...set].sort((a, b) => b.localeCompare(a));
  }, [rows]);

  const latestVersion = sortedVersions[0] ?? "";

  const enriched = useMemo(() => {
    return rows.map((r) => ({
      ...r,
      status: classifyVersion(r.version, latestVersion, sortedVersions, r.last_seen_at),
    }));
  }, [rows, latestVersion, sortedVersions]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return enriched.filter((r) => {
      if (q && !r.org_name.toLowerCase().includes(q) && !r.org_slug.toLowerCase().includes(q)) {
        return false;
      }
      if (onlyOutdated && r.status === "current") return false;
      if (onlyPwa && !r.is_standalone) return false;
      return true;
    });
  }, [enriched, search, onlyOutdated, onlyPwa]);

  const stats = useMemo(() => {
    const total = enriched.length;
    const current = enriched.filter((r) => r.status === "current").length;
    const stale = enriched.filter((r) => {
      const days = (Date.now() - new Date(r.last_seen_at).getTime()) / (1000 * 60 * 60 * 24);
      return days > 7;
    }).length;
    const pwa = enriched.filter((r) => r.is_standalone).length;
    return {
      total,
      current,
      stale,
      pwa,
      currentPct: total > 0 ? Math.round((current / total) * 100) : 0,
    };
  }, [enriched]);

  function exportCSV() {
    const header = "Loja,Slug,Plano,Versão,Status,Última atividade,Plataforma,User Agent\n";
    const body = filtered
      .map((r) =>
        [
          `"${r.org_name.replace(/"/g, '""')}"`,
          r.org_slug,
          r.org_plan,
          r.version,
          r.status,
          new Date(r.last_seen_at).toISOString(),
          r.is_standalone ? "PWA" : "Browser",
          `"${(r.user_agent ?? "").replace(/"/g, '""').slice(0, 200)}"`,
        ].join(","),
      )
      .join("\n");
    downloadCSV(header + body, `versoes-lojas-${new Date().toISOString().slice(0, 10)}.csv`);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" />
            Versões das Lojas
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Última versão registrada por cada loja. Versão mais recente vista:{" "}
            <span className="font-mono font-semibold">{latestVersion || "—"}</span>
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleForceHeartbeat}
            disabled={forcing || !organization?.id}
          >
            <Activity className={`w-4 h-4 mr-1.5 ${forcing ? "animate-pulse" : ""}`} />
            Forçar heartbeat
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRefreshKey((k) => k + 1)}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
          <Button variant="outline" size="sm" onClick={exportCSV} disabled={filtered.length === 0}>
            <Download className="w-4 h-4 mr-1.5" />
            CSV
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Lojas com heartbeat</p>
            <p className="text-2xl font-bold mt-1">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Atualizadas</p>
            <p className="text-2xl font-bold mt-1 text-emerald-600">
              {stats.current}{" "}
              <span className="text-sm font-normal text-muted-foreground">
                ({stats.currentPct}%)
              </span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Sem heartbeat &gt; 7d</p>
            <p className="text-2xl font-bold mt-1 text-rose-600">{stats.stale}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">PWA instalado</p>
            <p className="text-2xl font-bold mt-1">{stats.pwa}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou slug..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={onlyOutdated ? "default" : "outline"}
              onClick={() => setOnlyOutdated((v) => !v)}
            >
              Só desatualizadas
            </Button>
            <Button
              size="sm"
              variant={onlyPwa ? "default" : "outline"}
              onClick={() => setOnlyPwa((v) => !v)}
            >
              Só PWA instalado
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Activity className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Nenhuma loja com a versão nova ainda.</p>
              <p className="text-xs mt-2 max-w-md mx-auto leading-relaxed">
                Heartbeats aparecem aqui só depois que cada loja atualizar pro código com tracking.
                Lojas com PWA standalone podem demorar até 24h pra revalidar — o card de update
                agressivo (que força reload limpando cache) acelera isso.
              </p>
              <p className="text-xs mt-3 text-primary">
                Use <strong>"Forçar heartbeat"</strong> acima pra testar o pipeline com sua própria loja agora.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Loja</TableHead>
                  <TableHead>Versão</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Última atividade</TableHead>
                  <TableHead>Plataforma</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.organization_id}>
                    <TableCell>
                      <div className="font-medium">{r.org_name}</div>
                      <div className="text-xs text-muted-foreground">
                        /{r.org_slug} · {r.org_plan}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-muted">
                        {r.version}
                      </span>
                    </TableCell>
                    <TableCell>
                      {r.status === "current" && (
                        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-transparent hover:bg-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Atualizada
                        </Badge>
                      )}
                      {r.status === "behind" && (
                        <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-transparent hover:bg-amber-500/20">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Atrasada
                        </Badge>
                      )}
                      {r.status === "outdated" && (
                        <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border-transparent hover:bg-rose-500/20">
                          <XCircle className="w-3 h-3 mr-1" />
                          Desatualizada
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatRelative(r.last_seen_at)}
                    </TableCell>
                    <TableCell>
                      {r.is_standalone ? (
                        <Badge variant="outline" className="gap-1">
                          <Smartphone className="w-3 h-3" />
                          PWA
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1">
                          <Globe className="w-3 h-3" />
                          Browser
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
