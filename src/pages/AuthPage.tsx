import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import logoIcon from "@/assets/logo-icon.png";
import { toast } from "sonner";
import PasswordRequirements from "@/components/PasswordRequirements";

const translateAuthError = (msg?: string): string | undefined => {
  if (!msg) return undefined;
  const map: Record<string, string> = {
    "Invalid login credentials": "E-mail ou senha incorretos.",
    "User already registered": "Este e-mail já está cadastrado. Use a aba \"Entrar\" para fazer login.",
    "Password should be at least 6 characters": "A senha deve ter no mínimo 6 caracteres.",
    "Unable to validate email address: invalid format": "Formato de e-mail inválido.",
    "Email rate limit exceeded": "Muitas tentativas. Aguarde alguns minutos.",
    "Signup requires a valid password": "Informe uma senha válida.",
  };
  return map[msg];
};

const generateSlug = (name: string) =>
  name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");

const AuthPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, organization, loading: authLoading, refreshOrganizationForUser } = useAuth();

  const redirectTo = searchParams.get("redirect") || "/dashboard";
  const planParam = searchParams.get("plan");
  const refParam = searchParams.get("ref") || null;
  const fullRedirect = planParam && redirectTo.includes("/planos")
    ? `${redirectTo}?plan=${planParam}`
    : redirectTo;

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
      const { error: orgError } = await supabase.from("organizations").insert(orgPayload);
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

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      toast.error("Informe seu e-mail.");
      return;
    }
    setForgotLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
        redirectTo: 'https://trendfood.lovable.app/redefinir-senha',
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
        className="w-full h-12 rounded-full text-sm font-semibold gap-3 bg-white text-zinc-900 hover:bg-white/90 shadow-lg shadow-black/30"
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
      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-white/10" />
        <span className="text-[11px] uppercase tracking-widest text-white/40 font-medium">ou</span>
        <div className="flex-1 h-px bg-white/10" />
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
    if (!signupData.slug.trim()) {
      toast.error("Informe o slug da sua lanchonete.");
      return;
    }
    setSignupLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: signupData.email,
        password: signupData.password,
      });

      // Se o usuário já existe, tentar login automático e recuperar org/profile
      if (authError) {
        if (authError.message?.includes("already registered")) {
          const { data: loginData, error: loginErr } = await supabase.auth.signInWithPassword({
            email: signupData.email,
            password: signupData.password,
          });
          if (loginErr) throw loginErr;

          const userId = loginData.user.id;

          // Verificar/criar profile
          const { data: existingProfile } = await supabase
            .from("profiles")
            .select("id")
            .eq("user_id", userId)
            .maybeSingle();
          if (!existingProfile) {
            await supabase.from("profiles").insert({
              user_id: userId,
              full_name: signupData.fullName,
            });
          }

          // Verificar/criar organização (preservando indicação)
          const { data: existingOrg } = await supabase
            .from("organizations")
            .select("id")
            .eq("user_id", userId)
            .maybeSingle();

          if (!existingOrg) {
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
            const { error: orgError } = await supabase.from("organizations").insert(orgPayload);
            if (orgError) {
              if (orgError.code === "23505") {
                toast.error("Este slug já está em uso. Escolha outro nome para a lanchonete.");
              } else {
                throw orgError;
              }
              setSignupLoading(false);
              return;
            }
          }

          toast.success("Conta criada com sucesso! Bem-vindo! 🎉");
          await refreshOrganizationForUser(userId);
          navigate(fullRedirect, { replace: true });
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
      const { error: orgError } = await supabase.from("organizations").insert(orgPayload);

      if (orgError) {
        if (orgError.code === "23505") {
          toast.error("Este slug já está em uso. Escolha outro nome para a lanchonete.");
        } else {
          throw orgError;
        }
        setSignupLoading(false);
        return;
      }

      toast.success("Conta criada com sucesso! Bem-vindo! 🎉");
      await refreshOrganizationForUser(userId);
      navigate(fullRedirect, { replace: true });
    } catch (err: unknown) {
      const error = err as { message?: string };
      toast.error(translateAuthError(error.message) ?? error.message ?? "Erro ao criar conta.");
    } finally {
      setSignupLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginData.email,
        password: loginData.password,
      });
      if (error) throw error;
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
      toast.error(translateAuthError(error.message) ?? error.message ?? "E-mail ou senha incorretos.");
    } finally {
      setLoginLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex relative overflow-hidden text-white"
      style={{
        background: "hsl(20 25% 9%)",
      }}
    >
      {/* Subtle warm grain/noise overlay for depth */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.6'/></svg>\")",
        }}
      />

      {/* LEFT PANEL — Form */}
      <div className="flex-1 lg:w-1/2 relative z-10 flex flex-col justify-center px-6 py-12 lg:px-16 overflow-y-auto">
        {/* Top-left logo (desktop) */}
        <div className="hidden lg:flex items-center gap-2.5 absolute top-8 left-12">
          <Link to="/" className="inline-flex items-center gap-2.5">
            <img src={logoIcon} alt="TrendFood" className="w-8 h-8 rounded-lg object-contain" />
            <span className="font-bold text-white text-base tracking-tight">TrendFood</span>
          </Link>
        </div>

        {/* Top-right badge (desktop) */}
        <div className="hidden lg:flex absolute top-8 right-12 items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          <span className="text-xs text-white/70 font-medium">
            Você está entrando em <span className="text-white font-semibold">TrendFood</span>
          </span>
        </div>

        {/* Mobile-only logo */}
        <div className="flex justify-center mb-8 lg:hidden">
          <Link to="/" className="inline-flex items-center gap-2">
            <img src={logoIcon} alt="TrendFood" className="w-9 h-9 rounded-xl object-contain" />
            <span className="font-extrabold text-white text-lg">TrendFood</span>
          </Link>
        </div>

        <div className="w-full max-w-sm mx-auto">
          {googleOnboarding ? (
            <form onSubmit={handleGoogleOnboard} className="space-y-5">
              <div className="mb-6">
                <h2 className="font-bold text-white text-3xl tracking-tight">Complete seu cadastro</h2>
                <p className="text-white/60 text-sm mt-2">Só falta criar sua lanchonete!</p>
              </div>
              <div>
                <Label htmlFor="g-biz" className="text-sm font-medium mb-1.5 block text-white/80">Nome da lanchonete</Label>
                <Input id="g-biz" placeholder="Ex: Burguer do João" value={googleBiz.name} onChange={(e) => handleGoogleBizNameChange(e.target.value)} className="h-11 bg-white/5 border-white/10 text-white placeholder:text-white/30" required />
              </div>
              <div>
                <Label htmlFor="g-slug" className="text-sm font-medium mb-1.5 block text-white/80">Slug (URL)</Label>
                <Input id="g-slug" value={googleBiz.slug} onChange={(e) => setGoogleBiz((p) => ({ ...p, slug: generateSlug(e.target.value) }))} className="h-11 bg-white/5 border-white/10 text-white placeholder:text-white/30" required />
              </div>
              <div>
                <Label htmlFor="g-wpp" className="text-sm font-medium mb-1.5 block text-white/80">WhatsApp (com DDD)</Label>
                <Input id="g-wpp" placeholder="11999999999" value={googleBiz.whatsapp} onChange={(e) => setGoogleBiz((p) => ({ ...p, whatsapp: e.target.value }))} className="h-11 bg-white/5 border-white/10 text-white placeholder:text-white/30" required />
              </div>
              <Button type="submit" className="w-full h-12 rounded-full font-semibold bg-primary hover:bg-primary/90 text-primary-foreground" disabled={googleOnboardLoading}>
                {googleOnboardLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Criar lanchonete
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full h-11 text-sm text-white/60 hover:text-white hover:bg-white/5"
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
            <TabsList className="w-full h-11 bg-white/5 border border-white/10 rounded-full p-1 grid grid-cols-2 mb-8">
              <TabsTrigger
                value="login"
                className="rounded-full h-full text-sm font-semibold text-white/60 data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=active]:shadow-sm"
              >
                Entrar
              </TabsTrigger>
              <TabsTrigger
                value="signup"
                className="rounded-full h-full text-sm font-semibold text-white/60 data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=active]:shadow-sm"
              >
                Criar conta
              </TabsTrigger>
            </TabsList>

            {/* SIGNUP TAB */}
            <TabsContent value="signup" className="mt-0 space-y-5">
              <div className="mb-6">
                <h2 className="font-bold text-white text-3xl tracking-tight">Crie seu estabelecimento</h2>
                <p className="text-white/60 text-sm mt-2">Pronto em menos de 2 minutos</p>
              </div>
              <GoogleButton />
              <form onSubmit={handleSignup} className="space-y-4">
                {/* Dados pessoais */}
                <div>
                  <Label htmlFor="fullName" className="text-sm font-medium mb-1.5 block text-white/80">
                    Seu nome completo
                  </Label>
                  <Input
                    id="fullName"
                    placeholder="João da Silva"
                    value={signupData.fullName}
                    onChange={(e) => setSignupData((p) => ({ ...p, fullName: e.target.value }))}
                    className="h-11 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-primary/50"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="email" className="text-sm font-medium mb-1.5 block text-white/80">
                    E-mail
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="joao@email.com"
                    value={signupData.email}
                    onChange={(e) => setSignupData((p) => ({ ...p, email: e.target.value }))}
                    className="h-11 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-primary/50"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="confirmEmail" className="text-sm font-medium mb-1.5 block text-white/80">
                    Confirme seu e-mail
                  </Label>
                  <Input
                    id="confirmEmail"
                    type="email"
                    placeholder="joao@email.com"
                    value={signupData.confirmEmail}
                    onChange={(e) => setSignupData((p) => ({ ...p, confirmEmail: e.target.value }))}
                    className="h-11 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-primary/50"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="signup-pwd" className="text-sm font-medium mb-1.5 block text-white/80">
                    Senha
                  </Label>
                  <div className="relative">
                    <Input
                      id="signup-pwd"
                      type={showSignupPwd ? "text" : "password"}
                      placeholder="Mínimo 6 caracteres"
                      value={signupData.password}
                      onChange={(e) => setSignupData((p) => ({ ...p, password: e.target.value }))}
                      className="h-11 pr-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-primary/50"
                      minLength={6}
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                      onClick={() => setShowSignupPwd((v) => !v)}
                    >
                      {showSignupPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                   </div>
                  <PasswordRequirements password={signupData.password} />
                </div>
                <div>
                  <Label htmlFor="signup-confirm-pwd" className="text-sm font-medium mb-1.5 block text-white/80">
                    Confirme sua senha
                  </Label>
                  <div className="relative">
                    <Input
                      id="signup-confirm-pwd"
                      type={showSignupConfirmPwd ? "text" : "password"}
                      placeholder="Repita a senha"
                      value={signupData.confirmPassword}
                      onChange={(e) => setSignupData((p) => ({ ...p, confirmPassword: e.target.value }))}
                      className="h-11 pr-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-primary/50"
                      minLength={6}
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                      onClick={() => setShowSignupConfirmPwd((v) => !v)}
                    >
                      {showSignupConfirmPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Dados do estabelecimento */}
                <div className="pt-4 border-t border-white/10">
                  <p className="text-xs text-white/50 mb-3 font-semibold uppercase tracking-wide">
                    Dados do estabelecimento
                  </p>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="businessName" className="text-sm font-medium mb-1.5 block text-white/80">
                        Nome da lanchonete
                      </Label>
                      <Input
                        id="businessName"
                        placeholder="Burguer da Vila"
                        value={signupData.businessName}
                        onChange={(e) => handleBusinessNameChange(e.target.value)}
                        className="h-11 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-primary/50"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="slug" className="text-sm font-medium mb-1.5 block text-white/80">
                        URL pública
                      </Label>
                      <div className="flex items-center rounded-lg border border-white/10 bg-white/5 overflow-hidden focus-within:ring-2 focus-within:ring-primary/50 focus-within:ring-offset-0 h-11">
                        <span className="px-3 text-xs text-white/50 bg-white/5 border-r border-white/10 h-full flex items-center shrink-0 font-mono">
                          /u/
                        </span>
                        <input
                          id="slug"
                          className="flex-1 px-3 text-sm bg-transparent text-white placeholder:text-white/30 outline-none h-full"
                          placeholder="burguer-da-vila"
                          value={signupData.slug}
                          onChange={(e) =>
                            setSignupData((p) => ({
                              ...p,
                              slug: e.target.value.toLowerCase().replace(/\s+/g, "-"),
                            }))
                          }
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <Button type="submit" className="w-full h-12 rounded-full text-base font-bold mt-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/30" disabled={signupLoading}>
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
                    <h2 className="font-bold text-white text-3xl tracking-tight">Bem-vindo de volta</h2>
                    <p className="text-white/60 text-sm mt-2">Acesse seu painel de gestão</p>
                  </div>
                  <GoogleButton />
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <Label htmlFor="login-email" className="text-sm font-medium mb-1.5 block text-white/80">
                        E-mail
                      </Label>
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="joao@email.com"
                        value={loginData.email}
                        onChange={(e) => setLoginData((p) => ({ ...p, email: e.target.value }))}
                        className="h-11 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-primary/50"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="login-pwd" className="text-sm font-medium mb-1.5 block text-white/80">
                        Senha
                      </Label>
                      <div className="relative">
                        <Input
                          id="login-pwd"
                          type={showLoginPwd ? "text" : "password"}
                          placeholder="••••••••"
                          value={loginData.password}
                          onChange={(e) => setLoginData((p) => ({ ...p, password: e.target.value }))}
                          className="h-11 pr-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-primary/50"
                          required
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                          onClick={() => setShowLoginPwd((v) => !v)}
                        >
                          {showLoginPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <Button type="submit" className="w-full h-12 rounded-full text-base font-bold mt-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/30" disabled={loginLoading}>
                      {loginLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Entrando...
                        </>
                      ) : (
                        "Entrar no painel"
                      )}
                    </Button>
                    <button
                      type="button"
                      className="w-full text-sm text-primary hover:text-primary/80 hover:underline mt-2"
                      onClick={() => {
                        setForgotMode(true);
                        setForgotEmail(loginData.email);
                      }}
                    >
                      Esqueci minha senha
                    </button>
                  </form>
                </>
              ) : (
                <div className="space-y-5">
                  <div className="mb-6">
                    <h2 className="font-bold text-white text-3xl tracking-tight">Redefinir senha</h2>
                    <p className="text-white/60 text-sm mt-2">Enviaremos um link para o seu e-mail.</p>
                  </div>
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div>
                      <Label htmlFor="forgot-email" className="text-sm font-medium mb-1.5 block text-white/80">
                        E-mail
                      </Label>
                      <Input
                        id="forgot-email"
                        type="email"
                        placeholder="joao@email.com"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        className="h-11 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-primary/50"
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full h-12 rounded-full text-base font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/30" disabled={forgotLoading}>
                      {forgotLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                      Enviar link de redefinição
                    </Button>
                    <button
                      type="button"
                      className="w-full text-sm text-primary hover:text-primary/80 hover:underline mt-2"
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

          <p className="text-center text-xs text-white/40 mt-8">
            Ao criar sua conta, você concorda com nossos{" "}
            <Link to="/termos" target="_blank" className="underline cursor-pointer hover:text-white transition-colors">Termos de Uso</Link>.
          </p>
        </div>
      </div>

      {/* RIGHT PANEL — Cinematic logo (desktop only) */}
      <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center overflow-hidden">
        {/* Warm radial glow */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 70% 50%, hsl(20 90% 35% / 0.55) 0%, hsl(15 70% 18% / 0.4) 35%, transparent 70%)",
          }}
        />
        {/* Light leak from right */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 100% 50%, hsl(35 100% 60% / 0.25) 0%, transparent 55%)",
          }}
        />
        {/* Left edge fade — fuses with form panel */}
        <div
          className="absolute inset-y-0 left-0 w-32 pointer-events-none"
          style={{
            background:
              "linear-gradient(to right, hsl(15 45% 8%) 0%, transparent 100%)",
          }}
        />

        {/* Giant logo */}
        <div className="relative z-10 flex flex-col items-center gap-6">
          <img
            src={logoIcon}
            alt="TrendFood"
            className="w-[60vh] max-w-[520px] h-auto object-contain drop-shadow-[0_0_80px_hsl(20_100%_55%_/_0.45)] opacity-95"
          />
          <p className="text-white/70 text-base font-light tracking-wide">
            Zero taxas. <span className="text-white font-medium">100% seu.</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
