import { useState, useEffect, useRef } from "react";
import { useNavigate, Link, useSearchParams, useLocation } from "react-router-dom";
import PageSeo from "@/components/seo/PageSeo";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import authCinematicBg from "@/assets/auth-cinematic-bg.png";
import { toast } from "sonner";
import PasswordRequirements from "@/components/PasswordRequirements";
import { getPublicBaseUrl } from "@/lib/publicUrl";

const translateAuthError = (msg?: string): string => {
  const raw = (msg ?? "").trim();
  const m = raw.toLowerCase();
  if (!m) {
    return "Não foi possível concluir. Verifique os dados e tente novamente. Se persistir, fale com o suporte.";
  }

  if (m.includes("already registered") || m.includes("already been registered") || m.includes("user_already_exists")) {
    return 'Este e-mail já está cadastrado. Vá em "Entrar" e use sua senha, ou clique em "Esqueci minha senha".';
  }
  if (m.includes("invalid login credentials") || m.includes("invalid_credentials")) {
    return 'E-mail ou senha incorretos. Confira ou clique em "Esqueci minha senha".';
  }
  if (m.includes("email not confirmed") || m.includes("email_not_confirmed")) {
    return "Você ainda não confirmou seu e-mail. Abra a caixa de entrada (e o spam) e clique no link de confirmação.";
  }
  const lenMatch = raw.match(/at least (\d+) character/i);
  if (lenMatch) {
    return `Senha muito curta. Use pelo menos ${lenMatch[1]} caracteres.`;
  }
  if (m.includes("weak_password") || m.includes("password is known to be weak") || m.includes("pwned") || m.includes("password is too weak")) {
    return "Essa senha é fraca ou já vazou na internet. Use uma senha mais forte (letras, números e símbolos).";
  }
  if (m.includes("unable to validate email") || m.includes("invalid format") || m.includes("invalid email") || m.includes("email_address_invalid")) {
    return "E-mail inválido. Confira se digitou certo (ex: nome@dominio.com).";
  }
  if (m.includes("rate limit") || m.includes("over_email_send_rate_limit") || m.includes("too many requests")) {
    return "Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.";
  }
  const secMatch = raw.match(/after (\d+) seconds?/i);
  if (secMatch && m.includes("security")) {
    return `Por segurança, aguarde ${secMatch[1]} segundos antes de tentar de novo.`;
  }
  if (m.includes("signup is disabled") || m.includes("signups not allowed") || m.includes("signup_disabled")) {
    return "Cadastro temporariamente indisponível. Tente em alguns minutos.";
  }
  if (m.includes("anonymous sign-ins are disabled") || m.includes("anonymous_provider_disabled")) {
    return "Cadastro anônimo desativado. Use seu e-mail e senha.";
  }
  if (m.includes("database error") || m.includes("unexpected_failure") || m.includes("saving new user")) {
    return "Erro ao salvar sua conta. Tente novamente em alguns segundos — se continuar, fale com o suporte.";
  }
  if (m.includes("token has expired") || m.includes("otp_expired") || m.includes("invalid token") || m.includes("token is invalid")) {
    return "Link expirado. Peça um novo link para continuar.";
  }
  if (m.includes("new password should be different") || m.includes("same_password")) {
    return "A nova senha precisa ser diferente da anterior.";
  }
  if (m.includes("failed to fetch") || m.includes("networkerror") || m.includes("network error")) {
    return "Sem conexão com a internet. Verifique sua rede e tente de novo.";
  }
  if (m.includes("signup requires a valid password")) {
    return "Informe uma senha válida.";
  }
  return "Não foi possível concluir. Verifique os dados e tente novamente. Se persistir, fale com o suporte.";
};

const generateSlug = (name: string) =>
  name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");

// Normaliza e-mail para evitar duplicatas (Fulano@X.com vs fulano@x.com)
const normalizeEmail = (raw: string) => raw.trim().toLowerCase();

// Valida força mínima de senha no client (defesa em profundidade; Cloud também valida).
// Aplicado apenas em signup / troca de senha. Login aceita qualquer senha antiga.
const validatePassword = (pw: string): string | null => {
  if (!pw || pw.length < 8) return "Senha muito curta. Use pelo menos 8 caracteres.";
  if (!/[a-z]/.test(pw)) return "A senha precisa ter ao menos 1 letra minúscula.";
  if (!/[A-Z]/.test(pw)) return "A senha precisa ter ao menos 1 letra maiúscula.";
  if (!/\d/.test(pw)) return "A senha precisa ter ao menos 1 número.";
  return null;
};

// Rate limit client-side por e-mail (UX + defesa em profundidade).
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_LOCK_MS = 30_000;

const AuthPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { user, organization, loading: authLoading, refreshOrganizationForUser } = useAuth();

  // Bloqueia open redirect: aceita apenas caminhos relativos same-origin.
  const safeRedirect = (raw: string | null | undefined): string => {
    if (!raw) return "/dashboard";
    const v = raw.trim();
    if (!v.startsWith("/")) return "/dashboard";
    if (v.startsWith("//")) return "/dashboard";
    if (/^\/+(https?:|javascript:|data:|vbscript:)/i.test(v)) return "/dashboard";
    return v;
  };
  const redirectTo = safeRedirect(searchParams.get("redirect"));
  const planParam = searchParams.get("plan");
  const refParam = searchParams.get("ref") || null;
  const affParam = searchParams.get("aff") || (typeof window !== "undefined" ? localStorage.getItem("aff_code") : null);
  const fullRedirect = planParam && redirectTo.includes("/planos")
    ? `${redirectTo}?plan=${planParam}`
    : redirectTo;

  useEffect(() => {
    const aff = searchParams.get("aff");
    if (aff) {
      try { localStorage.setItem("aff_code", aff); } catch {}
    }
  }, [searchParams]);

  // Redirect authenticated users (covers Google OAuth callback)
  const [googleOnboarding, setGoogleOnboarding] = useState(false);
  const [googleBiz, setGoogleBiz] = useState({ name: "", slug: "", whatsapp: "" });
  const [googleOnboardLoading, setGoogleOnboardLoading] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setGoogleOnboarding(false);
      return;
    }
    if (organization) {
      navigate(fullRedirect, { replace: true });
      return;
    }
    // user exists, no org → onboarding
    setGoogleOnboarding(true);
  }, [user?.id, organization?.id, authLoading, fullRedirect, navigate]);

  const handleGoogleOnboard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleBiz.name.trim() || !googleBiz.slug.trim()) {
      toast.error("Preencha o nome da lanchonete.");
      return;
    }
    const whatsappDigits = googleBiz.whatsapp.replace(/\D/g, "");
    if (whatsappDigits.length < 10) {
      toast.error("Informe o WhatsApp com DDD (mín 10 dígitos).");
      return;
    }
    setGoogleOnboardLoading(true);
    try {
      // Resolve afiliado pelo código (?aff=)
      let affiliateId: string | null = null;
      if (affParam) {
        const { data: resolvedId } = await supabase.rpc("resolve_affiliate_code", { _code: affParam });
        if (resolvedId) affiliateId = resolvedId as unknown as string;
      }

      const orgPayload: any = {
        user_id: user!.id,
        name: googleBiz.name.trim(),
        slug: googleBiz.slug.trim(),
        emoji: "🍔",
        description: "Bem-vindo à nossa loja!",
        primary_color: "#f97316",
        whatsapp: googleBiz.whatsapp || null,
      };
      if (refParam) orgPayload.referred_by_id = refParam;
      if (affiliateId) orgPayload.affiliate_id = affiliateId;
      const { data: insertedOrg, error: orgError } = await supabase
        .from("organizations")
        .insert(orgPayload)
        .select("id")
        .maybeSingle();
      if (orgError) {
        if (orgError.code === "23505") {
          toast.error("Este slug já está em uso. Escolha outro nome.");
        } else {
          throw orgError;
        }
        return;
      }
      // Also create profile
      await supabase.from("profiles").insert({
        user_id: user!.id,
        full_name: user!.user_metadata?.full_name || user!.email?.split("@")[0] || "",
      }).then(() => {});
      // Notifica afiliado por Telegram (best-effort)
      if (affiliateId && insertedOrg?.id) {
        try {
          await supabase.functions.invoke("notify-affiliate-telegram", {
            body: { event_type: "new_signup", affiliate_id: affiliateId, organization_id: insertedOrg.id },
          });
        } catch (e) { console.warn("[notify-affiliate new_signup]", e); }
        try { localStorage.removeItem("aff_code"); } catch {}
      }
      toast.success("Loja criada com sucesso! 🎉");
      await refreshOrganizationForUser(user!.id);
      navigate(fullRedirect, { replace: true });
    } catch (err: unknown) {
      const error = err as { message?: string };
      toast.error(error.message ?? "Erro ao criar loja.");
    } finally {
      setGoogleOnboardLoading(false);
    }
  };

  const handleGoogleBizNameChange = (name: string) => {
    setGoogleBiz((prev) => ({ ...prev, name, slug: generateSlug(name) }));
  };


  const [signupData, setSignupData] = useState({
    fullName: "",
    email: "",
    confirmEmail: "",
    password: "",
    confirmPassword: "",
    businessName: "",
    slug: "",
    
  });
  const [signupLoading, setSignupLoading] = useState(false);
  const [showSignupPwd, setShowSignupPwd] = useState(false);
  const [showSignupConfirmPwd, setShowSignupConfirmPwd] = useState(false);

  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [loginLoading, setLoginLoading] = useState(false);
  const [showLoginPwd, setShowLoginPwd] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  // Rate limit de login (por e-mail digitado)
  const loginAttemptsRef = useRef<Map<string, { count: number; lockedUntil: number }>>(new Map());
  const [lockRemaining, setLockRemaining] = useState(0);

  useEffect(() => {
    const email = normalizeEmail(loginData.email);
    const entry = loginAttemptsRef.current.get(email);
    const until = entry?.lockedUntil ?? 0;
    const tick = () => {
      const rem = Math.max(0, Math.ceil((until - Date.now()) / 1000));
      setLockRemaining(rem);
    };
    tick();
    if (until > Date.now()) {
      const iv = setInterval(tick, 500);
      return () => clearInterval(iv);
    }
  }, [loginData.email, loginLoading]);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      toast.error("Informe seu e-mail.");
      return;
    }
    setForgotLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(normalizeEmail(forgotEmail), {
        redirectTo: `${getPublicBaseUrl()}/redefinir-senha`,
      });
      if (error) throw error;
      toast.success("Link de redefinição enviado para seu e-mail! Verifique sua caixa de entrada.");
      setForgotMode(false);
      setForgotEmail("");
    } catch (err: unknown) {
      const error = err as { message?: string };
      toast.error(error.message ?? "Erro ao enviar link de redefinição.");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${window.location.origin}/auth`,
      });
      if (result?.error) {
        toast.error("Erro ao entrar com Google. Tente novamente.");
      }
    } catch {
      toast.error("Erro ao entrar com Google. Tente novamente.");
    } finally {
      setGoogleLoading(false);
    }
  };

  const GoogleButton = () => (
    <>
      <Button
        type="button"
        className="w-full h-12 rounded-xl text-sm font-semibold gap-3 bg-[#1a1a1a] border border-white/10 text-white hover:bg-[#252525] transition-colors"
        onClick={handleGoogleLogin}
        disabled={googleLoading}
      >
        {googleLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
        )}
        Continuar com Google
      </Button>
      <div className="relative py-4 my-1">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5" /></div>
        <div className="relative flex justify-center">
          <span className="bg-[#0a0a0a] px-3 text-[11px] uppercase tracking-widest text-gray-500 font-medium">
            ou continue com e-mail
          </span>
        </div>
      </div>
    </>
  );

  const handleBusinessNameChange = (name: string) => {
    setSignupData((prev) => ({
      ...prev,
      businessName: name,
      slug: generateSlug(name),
    }));
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signupData.email !== signupData.confirmEmail) {
      toast.error("Os e-mails não coincidem.");
      return;
    }
    if (signupData.password !== signupData.confirmPassword) {
      toast.error("As senhas não coincidem.");
      return;
    }
    const pwError = validatePassword(signupData.password);
    if (pwError) {
      toast.error(pwError, { duration: 6000 });
      return;
    }
    if (!signupData.slug.trim()) {
      toast.error("Informe o slug da sua lanchonete.");
      return;
    }
    setSignupLoading(true);

    try {
      // Resolve afiliado pelo código (?aff=)
      let affiliateId: string | null = null;
      if (affParam) {
        const { data: resolvedId } = await supabase.rpc("resolve_affiliate_code", { _code: affParam });
        if (resolvedId) affiliateId = resolvedId as unknown as string;
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: normalizeEmail(signupData.email),
        password: signupData.password,
      });

      // Se o usuário já existe, NÃO fazer auto-login silencioso (risco de sequestro de conta).
      // Mostrar mensagem clara para que o usuário entre pelo fluxo normal.
      if (authError) {
        if (authError.message?.includes("already registered")) {
          toast.error(
            'Este e-mail já está cadastrado. Vá em "Entrar" e use sua senha, ou clique em "Esqueci minha senha".',
            { duration: 7000 }
          );
          setSignupLoading(false);
          return;
        }
        throw authError;
      }
      if (!authData.user) throw new Error("Usuário não criado.");

      const userId = authData.user.id;

      // Aguardar sessão RLS ficar ativa (race condition em conexões lentas)
      await new Promise((r) => setTimeout(r, 600));

      const { error: profileError } = await supabase.from("profiles").insert({
        user_id: userId,
        full_name: signupData.fullName,
      });
      if (profileError) {
        console.warn("[Signup] Profile insert failed:", profileError.message);
      }

      const orgPayload: any = {
        user_id: userId,
        name: signupData.businessName,
        slug: signupData.slug,
        emoji: "🍔",
        description: "Bem-vindo à nossa loja!",
        primary_color: "#f97316",
        whatsapp: null,
      };
      if (refParam) orgPayload.referred_by_id = refParam;
      if (affiliateId) orgPayload.affiliate_id = affiliateId;
      const { data: insertedOrg2, error: orgError } = await supabase
        .from("organizations").insert(orgPayload).select("id").maybeSingle();

      if (orgError) {
        if (orgError.code === "23505") {
          toast.error("Este slug já está em uso. Escolha outro nome para a lanchonete.");
        } else {
          throw orgError;
        }
        setSignupLoading(false);
        return;
      }

      if (affiliateId && insertedOrg2?.id) {
        try {
          await supabase.functions.invoke("notify-affiliate-telegram", {
            body: { event_type: "new_signup", affiliate_id: affiliateId, organization_id: insertedOrg2.id },
          });
        } catch (e) { console.warn("[notify-affiliate new_signup]", e); }
        try { localStorage.removeItem("aff_code"); } catch {}
      }

      toast.success("Conta criada com sucesso! Bem-vindo! 🎉");
      await refreshOrganizationForUser(userId);
      navigate(fullRedirect, { replace: true });
    } catch (err: unknown) {
      const error = err as { message?: string };
      toast.error(translateAuthError(error.message), { duration: 7000 });
    } finally {
      setSignupLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailKey = normalizeEmail(loginData.email);
    const entry = loginAttemptsRef.current.get(emailKey);
    if (entry && entry.lockedUntil > Date.now()) {
      const rem = Math.ceil((entry.lockedUntil - Date.now()) / 1000);
      toast.error(`Muitas tentativas. Aguarde ${rem}s e tente novamente.`);
      return;
    }
    setLoginLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailKey,
        password: loginData.password,
      });
      if (error) throw error;
      // Sucesso: limpa contador desse e-mail
      loginAttemptsRef.current.delete(emailKey);
      toast.success("Login realizado com sucesso!");

      // Redirecionar admin para /admin, demais usuários para /dashboard
      if (data.user) {
        try {
          const { data: roleData } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", data.user.id)
            .eq("role", "admin")
            .maybeSingle();
          navigate(roleData ? "/admin" : fullRedirect, { replace: true });
        } catch {
          navigate(fullRedirect, { replace: true });
        }
      } else {
        navigate(fullRedirect, { replace: true });
      }
    } catch (err: unknown) {
      const error = err as { message?: string };
      // Registra falha e aplica lock após N tentativas
      const cur = loginAttemptsRef.current.get(emailKey) ?? { count: 0, lockedUntil: 0 };
      const nextCount = cur.count + 1;
      const nextLock = nextCount >= LOGIN_MAX_ATTEMPTS ? Date.now() + LOGIN_LOCK_MS : 0;
      loginAttemptsRef.current.set(emailKey, { count: nextCount, lockedUntil: nextLock });
      toast.error(translateAuthError(error.message), { duration: 7000 });
    } finally {
      setLoginLoading(false);
    }
  };

  const isCadastro = location.pathname.startsWith("/cadastro");
  const seoTitle = isCadastro
    ? "Cadastre sua loja — TrendFood"
    : "Entrar — TrendFood";
  const seoDesc = isCadastro
    ? "Crie sua conta TrendFood e ative o cardápio digital com taxa 0%, pedidos no WhatsApp e gestão de cozinha em minutos."
    : "Acesse o painel TrendFood: gerencie pedidos, cardápio e cozinha do seu restaurante com taxa 0%.";
  const BrandMark = ({ className = "" }: { className?: string }) => (
    <Link to="/" className={`inline-flex items-center gap-2.5 shrink-0 ${className}`}>
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center"
        style={{
          background: "#e85d3a",
          boxShadow: "0 0 15px rgba(232,93,58,0.4)",
        }}
      >
        <span className="text-black font-bold text-xl font-display leading-none">T</span>
      </div>
      <span className="font-display font-bold text-2xl tracking-tight text-white">
        Trend<span style={{ color: "#e85d3a" }}>Food</span>
      </span>
    </Link>
  );

  return (
    <>
    <PageSeo title={seoTitle} description={seoDesc} path={isCadastro ? "/cadastro" : "/auth"} noindex />
    <div
      className="min-h-screen flex relative overflow-hidden text-white"
      style={{
        background: "#0a0a0a",
        fontFamily: '"DM Sans", system-ui, sans-serif',
      }}
    >
      {/* LEFT PANEL — Form */}
      <div className="w-full lg:w-1/2 relative z-10 flex flex-col px-6 py-8 sm:px-10 lg:px-16 xl:px-24 overflow-y-auto">
        {/* Top header row (desktop): logo left, badge right */}
        <div className="hidden lg:flex items-center justify-between gap-6 shrink-0 animate-fade-in">
          <BrandMark />
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-sm shrink-0"
            style={{
              background: "rgba(232,93,58,0.08)",
              border: "1px solid rgba(232,93,58,0.2)",
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#e85d3a" }} />
            <span className="text-xs text-white/80 font-medium whitespace-nowrap">
              <span className="hidden xl:inline">Você está entrando em </span>
              <span className="xl:hidden">Entrando em </span>
              <span className="text-white font-semibold">TrendFood</span>
            </span>
          </div>
        </div>

        {/* Mobile-only header */}
        <div className="flex justify-center mb-8 lg:hidden animate-fade-in">
          <BrandMark />
        </div>

        {/* Form area — centered vertically without overlapping the header */}
        <div className="w-full max-w-md mx-auto flex-1 flex flex-col justify-center py-8 lg:py-12 animate-fade-in [animation-delay:120ms]">
          {googleOnboarding ? (
            <form onSubmit={handleGoogleOnboard} className="space-y-5">
              <div className="mb-6">
                <h2 className="font-display font-bold text-white text-4xl tracking-tight">Complete seu cadastro</h2>
                <p className="text-gray-400 text-sm mt-2">Só falta criar sua lanchonete!</p>
              </div>
              <div>
                <Label htmlFor="g-biz" className="text-sm font-medium mb-1.5 block text-gray-300">Nome da lanchonete</Label>
                <Input id="g-biz" placeholder="Ex: Burguer do João" value={googleBiz.name} onChange={(e) => { if (!e?.target) return; handleGoogleBizNameChange(e.target.value); }} className="h-12 rounded-xl bg-[#1a1a1a] border-white/10 text-white placeholder:text-gray-600 focus-visible:ring-2 focus-visible:ring-[#e85d3a]/50 focus-visible:border-[#e85d3a]" required />
              </div>
              <div>
                <Label htmlFor="g-slug" className="text-sm font-medium mb-1.5 block text-gray-300">Slug (URL)</Label>
                <Input id="g-slug" value={googleBiz.slug} onChange={(e) => { if (!e?.target) return; setGoogleBiz((p) => ({ ...p, slug: generateSlug(e.target.value) })); }} className="h-12 rounded-xl bg-[#1a1a1a] border-white/10 text-white placeholder:text-gray-600 focus-visible:ring-2 focus-visible:ring-[#e85d3a]/50 focus-visible:border-[#e85d3a]" required />
              </div>
              <div>
                <Label htmlFor="g-wpp" className="text-sm font-medium mb-1.5 block text-gray-300">WhatsApp (com DDD)</Label>
                <Input id="g-wpp" placeholder="11999999999" value={googleBiz.whatsapp} onChange={(e) => { if (!e?.target) return; setGoogleBiz((p) => ({ ...p, whatsapp: e.target.value })); }} className="h-12 rounded-xl bg-[#1a1a1a] border-white/10 text-white placeholder:text-gray-600 focus-visible:ring-2 focus-visible:ring-[#e85d3a]/50 focus-visible:border-[#e85d3a]" required />
              </div>
              <Button type="submit" className="w-full h-12 rounded-xl font-bold text-black bg-[#e85d3a] hover:bg-[#ff6d4a] shadow-lg shadow-[#e85d3a]/20 active:scale-[0.98] transition-all" disabled={googleOnboardLoading}>
                {googleOnboardLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Criar lanchonete
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full h-11 text-sm text-gray-400 hover:text-white hover:bg-white/5"
                onClick={async () => {
                  await supabase.auth.signOut();
                  setGoogleOnboarding(false);
                }}
              >
                Usar outro e-mail
              </Button>
            </form>
          ) : (
          <Tabs defaultValue="login">
            <TabsList className="w-full h-11 bg-[#1a1a1a] border border-white/10 rounded-full p-1 grid grid-cols-2 mb-8">
              <TabsTrigger
                value="login"
                className="rounded-full h-full text-sm font-semibold text-gray-400 data-[state=active]:bg-[#e85d3a] data-[state=active]:text-black data-[state=active]:shadow-lg data-[state=active]:shadow-[#e85d3a]/30 transition-all"
              >
                Entrar
              </TabsTrigger>
              <TabsTrigger
                value="signup"
                className="rounded-full h-full text-sm font-semibold text-gray-400 data-[state=active]:bg-[#e85d3a] data-[state=active]:text-black data-[state=active]:shadow-lg data-[state=active]:shadow-[#e85d3a]/30 transition-all"
              >
                Criar conta
              </TabsTrigger>
            </TabsList>

            {/* SIGNUP TAB */}
            <TabsContent value="signup" className="mt-0 space-y-5">
              <div className="mb-6">
                <h2 className="font-display font-bold text-white text-4xl tracking-tight">Crie seu estabelecimento</h2>
                <p className="text-gray-400 text-sm mt-2">Pronto em menos de 2 minutos. Sem taxas, sem letras miúdas.</p>
              </div>
              <GoogleButton />
              <form onSubmit={handleSignup} className="space-y-4">
                {/* Dados pessoais */}
                <div>
                  <Label htmlFor="fullName" className="text-sm font-medium mb-1.5 block text-gray-300">
                    Seu nome completo
                  </Label>
                  <Input
                    id="fullName"
                    placeholder="João da Silva"
                    value={signupData.fullName}
                    onChange={(e) => { if (!e?.target) return; setSignupData((p) => ({ ...p, fullName: e.target.value })); }}
                    className="h-12 rounded-xl bg-[#1a1a1a] border-white/10 text-white placeholder:text-gray-600 focus-visible:ring-2 focus-visible:ring-[#e85d3a]/50 focus-visible:border-[#e85d3a]"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="email" className="text-sm font-medium mb-1.5 block text-gray-300">
                    E-mail
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="joao@email.com"
                    value={signupData.email}
                    onChange={(e) => { if (!e?.target) return; setSignupData((p) => ({ ...p, email: e.target.value })); }}
                    className="h-12 rounded-xl bg-[#1a1a1a] border-white/10 text-white placeholder:text-gray-600 focus-visible:ring-2 focus-visible:ring-[#e85d3a]/50 focus-visible:border-[#e85d3a]"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="confirmEmail" className="text-sm font-medium mb-1.5 block text-gray-300">
                    Confirme seu e-mail
                  </Label>
                  <Input
                    id="confirmEmail"
                    type="email"
                    placeholder="joao@email.com"
                    value={signupData.confirmEmail}
                    onChange={(e) => { if (!e?.target) return; setSignupData((p) => ({ ...p, confirmEmail: e.target.value })); }}
                    className="h-12 rounded-xl bg-[#1a1a1a] border-white/10 text-white placeholder:text-gray-600 focus-visible:ring-2 focus-visible:ring-[#e85d3a]/50 focus-visible:border-[#e85d3a]"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="signup-pwd" className="text-sm font-medium mb-1.5 block text-gray-300">
                    Senha
                  </Label>
                  <div className="relative">
                    <Input
                      id="signup-pwd"
                      type={showSignupPwd ? "text" : "password"}
                      placeholder="Mínimo 6 caracteres"
                      value={signupData.password}
                      onChange={(e) => { if (!e?.target) return; setSignupData((p) => ({ ...p, password: e.target.value })); }}
                      className="h-12 rounded-xl pr-10 bg-[#1a1a1a] border-white/10 text-white placeholder:text-gray-600 focus-visible:ring-2 focus-visible:ring-[#e85d3a]/50 focus-visible:border-[#e85d3a]"
                      minLength={6}
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                      onClick={() => setShowSignupPwd((v) => !v)}
                    >
                      {showSignupPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                   </div>
                  <PasswordRequirements password={signupData.password} />
                </div>
                <div>
                  <Label htmlFor="signup-confirm-pwd" className="text-sm font-medium mb-1.5 block text-gray-300">
                    Confirme sua senha
                  </Label>
                  <div className="relative">
                    <Input
                      id="signup-confirm-pwd"
                      type={showSignupConfirmPwd ? "text" : "password"}
                      placeholder="Repita a senha"
                      value={signupData.confirmPassword}
                      onChange={(e) => { if (!e?.target) return; setSignupData((p) => ({ ...p, confirmPassword: e.target.value })); }}
                      className="h-12 rounded-xl pr-10 bg-[#1a1a1a] border-white/10 text-white placeholder:text-gray-600 focus-visible:ring-2 focus-visible:ring-[#e85d3a]/50 focus-visible:border-[#e85d3a]"
                      minLength={6}
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                      onClick={() => setShowSignupConfirmPwd((v) => !v)}
                    >
                      {showSignupConfirmPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Dados do estabelecimento */}
                <div className="pt-4 border-t border-white/5">
                  <p className="text-xs mb-3 font-semibold uppercase tracking-widest" style={{ color: "#f0d78c" }}>
                    Dados do estabelecimento
                  </p>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="businessName" className="text-sm font-medium mb-1.5 block text-gray-300">
                        Nome da lanchonete
                      </Label>
                      <Input
                        id="businessName"
                        placeholder="Burguer da Vila"
                        value={signupData.businessName}
                        onChange={(e) => { if (!e?.target) return; handleBusinessNameChange(e.target.value); }}
                        className="h-12 rounded-xl bg-[#1a1a1a] border-white/10 text-white placeholder:text-gray-600 focus-visible:ring-2 focus-visible:ring-[#e85d3a]/50 focus-visible:border-[#e85d3a]"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="slug" className="text-sm font-medium mb-1.5 block text-gray-300">
                        URL pública
                      </Label>
                      <div className="flex items-center rounded-xl border border-white/10 bg-[#1a1a1a] overflow-hidden focus-within:ring-2 focus-within:ring-[#e85d3a]/50 h-12">
                        <span className="px-3 text-xs text-gray-400 bg-black/30 border-r border-white/10 h-full flex items-center shrink-0 font-mono">
                          /u/
                        </span>
                        <input
                          id="slug"
                          className="flex-1 px-3 text-sm bg-transparent text-white placeholder:text-gray-600 outline-none h-full"
                          placeholder="burguer-da-vila"
                          value={signupData.slug}
                          onChange={(e) => {
                            if (!e?.target) return;
                            setSignupData((p) => ({
                              ...p,
                              slug: e.target.value.toLowerCase().replace(/\s+/g, "-"),
                            }));
                          }}
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <Button type="submit" className="w-full h-12 rounded-xl text-base font-bold text-black mt-2 bg-[#e85d3a] hover:bg-[#ff6d4a] shadow-lg shadow-[#e85d3a]/25 hover:shadow-[#e85d3a]/40 active:scale-[0.98] transition-all" disabled={signupLoading}>
                  {signupLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Criando conta...
                    </>
                  ) : (
                    "Criar minha conta grátis"
                  )}
                </Button>
              </form>
            </TabsContent>

            {/* LOGIN TAB */}
            <TabsContent value="login" className="mt-0 space-y-5">
              {!forgotMode ? (
                <>
                  <div className="mb-6">
                    <h2 className="font-display font-bold text-white text-4xl tracking-tight">Bem-vindo de volta</h2>
                    <p className="text-gray-400 text-sm mt-2">Acesse sua conta para gerenciar seu restaurante sem taxas.</p>
                  </div>
                  <GoogleButton />
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <Label htmlFor="login-email" className="text-sm font-medium mb-1.5 block text-gray-300">
                        E-mail do restaurante
                      </Label>
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="joao@email.com"
                        value={loginData.email}
                        onChange={(e) => { if (!e?.target) return; setLoginData((p) => ({ ...p, email: e.target.value })); }}
                        className="h-12 rounded-xl bg-[#1a1a1a] border-white/10 text-white placeholder:text-gray-600 focus-visible:ring-2 focus-visible:ring-[#e85d3a]/50 focus-visible:border-[#e85d3a]"
                        required
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <Label htmlFor="login-pwd" className="text-sm font-medium block text-gray-300">
                          Senha
                        </Label>
                        <button
                          type="button"
                          className="text-xs font-medium hover:underline"
                          style={{ color: "#f0d78c" }}
                          onClick={() => {
                            setForgotMode(true);
                            setForgotEmail(loginData.email);
                          }}
                        >
                          Esqueceu a senha?
                        </button>
                      </div>
                      <div className="relative">
                        <Input
                          id="login-pwd"
                          type={showLoginPwd ? "text" : "password"}
                          placeholder="••••••••"
                          value={loginData.password}
                          onChange={(e) => { if (!e?.target) return; setLoginData((p) => ({ ...p, password: e.target.value })); }}
                          className="h-12 rounded-xl pr-10 bg-[#1a1a1a] border-white/10 text-white placeholder:text-gray-600 focus-visible:ring-2 focus-visible:ring-[#e85d3a]/50 focus-visible:border-[#e85d3a]"
                          required
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                          onClick={() => setShowLoginPwd((v) => !v)}
                        >
                          {showLoginPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <Button type="submit" className="w-full h-12 rounded-xl text-base font-bold text-black mt-2 bg-[#e85d3a] hover:bg-[#ff6d4a] shadow-lg shadow-[#e85d3a]/25 hover:shadow-[#e85d3a]/40 active:scale-[0.98] transition-all" disabled={loginLoading || lockRemaining > 0}>
                      {loginLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Entrando...
                        </>
                      ) : lockRemaining > 0 ? (
                        `Aguarde ${lockRemaining}s...`
                      ) : (
                        "Entrar no painel"
                      )}
                    </Button>
                  </form>
                </>
              ) : (
                <div className="space-y-5">
                  <div className="mb-6">
                    <h2 className="font-display font-bold text-white text-4xl tracking-tight">Redefinir senha</h2>
                    <p className="text-gray-400 text-sm mt-2">Enviaremos um link para o seu e-mail.</p>
                  </div>
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div>
                      <Label htmlFor="forgot-email" className="text-sm font-medium mb-1.5 block text-gray-300">
                        E-mail
                      </Label>
                      <Input
                        id="forgot-email"
                        type="email"
                        placeholder="joao@email.com"
                        value={forgotEmail}
                        onChange={(e) => { if (!e?.target) return; setForgotEmail(e.target.value); }}
                        className="h-12 rounded-xl bg-[#1a1a1a] border-white/10 text-white placeholder:text-gray-600 focus-visible:ring-2 focus-visible:ring-[#e85d3a]/50 focus-visible:border-[#e85d3a]"
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full h-12 rounded-xl text-base font-bold text-black bg-[#e85d3a] hover:bg-[#ff6d4a] shadow-lg shadow-[#e85d3a]/25 active:scale-[0.98] transition-all" disabled={forgotLoading}>
                      {forgotLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                      Enviar link de redefinição
                    </Button>
                    <button
                      type="button"
                      className="w-full text-sm hover:underline mt-2"
                      style={{ color: "#f0d78c" }}
                      onClick={() => setForgotMode(false)}
                    >
                      ← Voltar ao login
                    </button>
                  </form>
                </div>
              )}
            </TabsContent>
          </Tabs>
          )}

          <p className="text-center text-xs text-gray-500 mt-8">
            Ao criar sua conta, você concorda com nossos{" "}
            <Link to="/termos" target="_blank" className="underline cursor-pointer hover:text-white transition-colors" style={{ color: "#f0d78c" }}>Termos de Uso</Link>.
          </p>
        </div>
      </div>

      {/* RIGHT PANEL — Cinematic hero (desktop only) */}
      <div className="hidden lg:block relative lg:w-1/2 overflow-hidden">
        {/* Cinematic background */}
        <img
          src={authCinematicBg}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Dark bottom fade */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(to top, #0a0a0a 0%, rgba(10,10,10,0.4) 55%, transparent 100%)",
          }}
        />
        {/* Ember mix overlay */}
        <div
          className="absolute inset-0 pointer-events-none mix-blend-overlay"
          style={{ background: "rgba(232,93,58,0.1)" }}
        />

        {/* Top-right glass metric card */}
        <div
          className="absolute top-10 right-10 z-10 p-4 rounded-2xl backdrop-blur-md animate-fade-in [animation-delay:300ms]"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-[11px] text-gray-400 uppercase tracking-wider">Vendas hoje</p>
              <p className="text-sm font-bold text-white font-display">+ R$ 4.280,00</p>
            </div>
          </div>
        </div>

        {/* Bottom content overlay */}
        <div className="absolute bottom-16 left-16 right-16 z-10 space-y-5 animate-fade-in [animation-delay:200ms]">
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full"
            style={{
              background: "rgba(240,215,140,0.1)",
              border: "1px solid rgba(240,215,140,0.25)",
            }}
          >
            <div
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: "#f0d78c" }}
            />
            <span
              className="text-[10px] uppercase tracking-widest font-bold"
              style={{ color: "#f0d78c" }}
            >
              Taxa Zero Forever
            </span>
          </div>
          <h2 className="font-display font-bold text-white text-4xl xl:text-5xl leading-tight tracking-tight">
            A liberdade que seu <br />
            <span style={{ color: "#e85d3a" }}>lucro merece.</span>
          </h2>
          <p className="text-gray-300 text-lg max-w-md">
            Junte-se a mais de 2.000 restaurantes que abandonaram as taxas abusivas dos marketplaces.
          </p>
        </div>
      </div>
    </div>
    </>
  );
};

export default AuthPage;
