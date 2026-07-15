import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Copy, RefreshCw, Store as StoreIcon, Check } from "lucide-react";

const slugify = (v: string) =>
  v.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
   .replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 60);

function genPassword(len = 12) {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let s = "";
  const arr = new Uint32Array(len);
  crypto.getRandomValues(arr);
  for (let i = 0; i < len; i++) s += chars[arr[i] % chars.length];
  return s;
}

type Plan = "free" | "pro" | "enterprise" | "lifetime";

export default function CreateStoreTab() {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(genPassword());
  const [whatsapp, setWhatsapp] = useState("");
  const [fullName, setFullName] = useState("");
  const [plan, setPlan] = useState<Plan>("free");
  const [trialDays, setTrialDays] = useState(0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<null | {
    email: string; password: string; slug: string;
  }>(null);
  const [copied, setCopied] = useState<string>("");

  const submit = async () => {
    if (!name.trim()) return toast.error("Informe o nome da loja");
    if (!email.trim()) return toast.error("Informe o e-mail");
    if (password.length < 8) return toast.error("Senha deve ter ao menos 8 caracteres");
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-create-store", {
        body: {
          name: name.trim(),
          slug: slug.trim() || slugify(name),
          email: email.trim().toLowerCase(),
          password,
          whatsapp: whatsapp.replace(/\D/g, "") || null,
          full_name: fullName.trim() || name.trim(),
          plan,
          trial_days: Number(trialDays) || 0,
        },
      });
      // supabase.functions.invoke throws for non-2xx and hides the body.
      // Try to read the body from error.context to surface the real reason.
      let d: any = data;
      if (error) {
        try {
          const ctx: any = (error as any).context;
          if (ctx && typeof ctx.json === "function") d = await ctx.json();
          else if (ctx && typeof ctx.text === "function") {
            const t = await ctx.text();
            try { d = JSON.parse(t); } catch { d = { error: t }; }
          }
        } catch { /* ignore */ }
        if (!d) throw error;
      }
      if (!d?.ok) {
        const map: Record<string, string> = {
          slug_in_use: "Este slug já está em uso.",
          email_in_use: "Este e-mail já está cadastrado.",
          invalid_email: "E-mail inválido.",
          weak_password: "Senha fraca (mínimo 8 caracteres).",
          invalid_slug: "Slug inválido.",
          missing_name: "Informe o nome da loja.",
          forbidden: "Somente o admin pode criar lojas.",
          unauthorized: "Sessão expirada. Entre novamente.",
          profile_create_failed: "Falha ao criar perfil do usuário.",
          org_create_failed: "Falha ao criar a organização.",
          auth_create_failed: "Falha ao criar o usuário.",
          db_error: "Erro no banco de dados.",
        };
        throw new Error(map[d?.error] || d?.detail || d?.error || "Falha ao criar loja");
      }
      setResult({ email: d.email, password: d.password, slug: d.slug });
      toast.success("Loja criada com sucesso!");
    } catch (e: any) {
      toast.error(e?.message || "Erro ao criar loja");
    } finally {
      setLoading(false);
    }
  };

  const copy = async (v: string, k: string) => {
    await navigator.clipboard.writeText(v);
    setCopied(k);
    setTimeout(() => setCopied(""), 1500);
  };

  const reset = () => {
    setResult(null);
    setName(""); setSlug(""); setEmail(""); setWhatsapp(""); setFullName("");
    setPassword(genPassword()); setPlan("free"); setTrialDays(0);
  };

  if (result) {
    const loginUrl = `${window.location.origin}/auth`;
    const storeUrl = `${window.location.origin}/${result.slug}`;
    const msg = `Olá! Sua loja no TrendFood está pronta 🎉\n\n🔑 Acesso:\n${loginUrl}\nE-mail: ${result.email}\nSenha: ${result.password}\n\n🏪 Sua loja: ${storeUrl}\n\nDica: após entrar, altere o e-mail e a senha em Configurações.`;
    return (
      <section className="max-w-2xl mx-auto p-6 space-y-4">
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6">
          <div className="flex items-center gap-2 text-emerald-400 mb-3">
            <Check className="w-5 h-5" />
            <h2 className="text-lg font-semibold">Loja criada</h2>
          </div>
          <div className="space-y-3 text-sm">
            {[
              ["E-mail", result.email, "email"],
              ["Senha", result.password, "pwd"],
              ["URL da loja", storeUrl, "url"],
              ["Link de login", loginUrl, "login"],
            ].map(([label, val, k]) => (
              <div key={k} className="flex items-center justify-between gap-3 bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2">
                <div className="min-w-0">
                  <div className="text-white/50 text-xs">{label}</div>
                  <div className="text-white truncate font-mono text-[13px]">{val}</div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => copy(String(val), String(k))}>
                  {copied === k ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={() => copy(msg, "msg")} variant="secondary">
              {copied === "msg" ? "Copiado!" : "Copiar mensagem para o cliente"}
            </Button>
            <Button onClick={reset}>Criar outra loja</Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="max-w-2xl mx-auto p-6 space-y-5">
      <div className="flex items-center gap-2">
        <StoreIcon className="w-5 h-5 text-orange-400" />
        <h2 className="text-xl font-semibold text-white">Criar loja para cliente</h2>
      </div>
      <p className="text-sm text-white/60">
        Cria a conta já confirmada. Depois o cliente entra, altera o e-mail e a senha em Configurações.
      </p>

      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label>Nome da loja *</Label>
          <Input value={name} onChange={(e) => {
            setName(e.target.value);
            if (!slug) setSlug(slugify(e.target.value));
          }} placeholder="Ex: Burguer do João" />
        </div>

        <div className="grid gap-2">
          <Label>Slug *</Label>
          <Input value={slug} onChange={(e) => setSlug(slugify(e.target.value))} placeholder="burguer-do-joao" />
          <p className="text-xs text-white/40">URL: {window.location.origin}/{slug || "..."}</p>
        </div>

        <div className="grid gap-2">
          <Label>Nome do dono</Label>
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ex: João Silva" />
        </div>

        <div className="grid gap-2">
          <Label>E-mail *</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="cliente@email.com ou temporário" />
        </div>

        <div className="grid gap-2">
          <Label>Senha inicial *</Label>
          <div className="flex gap-2">
            <Input value={password} onChange={(e) => setPassword(e.target.value)} className="font-mono" />
            <Button type="button" variant="secondary" onClick={() => setPassword(genPassword())}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="grid gap-2">
          <Label>WhatsApp (opcional)</Label>
          <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="11999999999" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label>Plano</Label>
            <select
              value={plan}
              onChange={(e) => setPlan(e.target.value as Plan)}
              className="h-10 rounded-md bg-[#1a1a1a] border border-white/10 text-white px-3 text-sm"
            >
              <option value="free">Free</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
              <option value="lifetime">Lifetime</option>
            </select>
          </div>
          <div className="grid gap-2">
            <Label>Trial (dias)</Label>
            <Input type="number" min={0} max={90} value={trialDays}
              onChange={(e) => setTrialDays(Number(e.target.value) || 0)} />
          </div>
        </div>

        <Button onClick={submit} disabled={loading} className="mt-2">
          {loading ? "Criando..." : "Criar loja"}
        </Button>
      </div>
    </section>
  );
}