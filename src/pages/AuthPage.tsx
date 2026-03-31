import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Eye, EyeOff, Loader2, Check } from "lucide-react";
import logoIcon from "@/assets/logo-icon.png";
import { toast } from "sonner";

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
    if (user && organization) {
      navigate(fullRedirect, { replace: true });
    } else if (user && !organization) {
      // New Google user without org — show onboarding
      setGoogleOnboarding(true);
    }
  }, [user, organization, authLoading, navigate, fullRedirect]);

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
    whatsapp: "",
  });
  const [signupLoading, setSignupLoading] = useState(false);
  const [showSignupPwd, setShowSignupPwd] = useState(false);
  const [showSignupConfirmPwd, setShowSignupConfirmPwd] = useState(false);

  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [loginLoading, setLoginLoading] = useState(false);
  const [showLoginPwd, setShowLoginPwd] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
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
        variant="outline"
        className="w-full h-11 text-sm font-semibold gap-3"
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
      <div className="flex items-center gap-3 my-4">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground font-medium">ou</span>
        <div className="flex-1 h-px bg-border" />
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
    const whatsappDigits = signupData.whatsapp.replace(/\D/g, "");
    if (whatsappDigits.length < 10) {
      toast.error("Informe o WhatsApp com DDD (mín 10 dígitos) para receber pedidos.");
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
              whatsapp: signupData.whatsapp || null,
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
        whatsapp: signupData.whatsapp || null,
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
    <div className="min-h-screen flex">
      {/* LEFT PANEL — Visual (desktop only) */}
      <div
        className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 overflow-hidden"
        style={{ minHeight: "100vh" }}
      >
        {/* Background photo */}
        <img
          src="https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=1200&q=80"
          alt="Interior de restaurante aconchegante"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Dark red gradient overlay */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(160deg, rgba(90,5,5,0.90) 0%, rgba(20,3,3,0.95) 100%)",
          }}
        />

        {/* Content over overlay */}
        <div className="relative z-10 flex flex-col h-full justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <img src={logoIcon} alt="TrendFood" className="w-10 h-10 rounded-xl object-contain" />
            <span className="font-extrabold text-white text-xl tracking-tight">TrendFood</span>
          </div>

          {/* Center content */}
          <div className="flex-1 flex flex-col justify-center py-16">
            <h1 className="text-4xl font-extrabold text-white leading-tight mb-4">
              Transforme o gosto dos seus clientes em lucro
            </h1>
            <p className="text-white/70 text-lg leading-relaxed mb-10">
              Gerencie pedidos, cardápio digital e métricas do seu negócio em um só lugar.
            </p>

            {/* Bullets */}
            <ul className="space-y-4">
              {[
                "Sem instalação de aplicativo",
                "Cardápio digital personalizado",
                "Painel completo de métricas",
              ].map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-primary/80 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-white" strokeWidth={3} />
                  </div>
                  <span className="text-white/90 text-sm font-medium">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Footer badge */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/50 font-medium">
              Grátis para começar · Sem cartão de crédito
            </span>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL — Form */}
      <div className="flex-1 lg:w-1/2 bg-background flex flex-col justify-center px-6 py-12 lg:px-16 overflow-y-auto">
        {/* Mobile-only logo */}
        <div className="flex justify-center mb-8 lg:hidden">
          <Link to="/" className="inline-flex items-center gap-2">
            <img src={logoIcon} alt="TrendFood" className="w-9 h-9 rounded-xl object-contain" />
            <span className="font-extrabold text-foreground text-lg">TrendFood</span>
          </Link>
        </div>

        <div className="w-full max-w-sm mx-auto">
          {googleOnboarding ? (
            <form onSubmit={handleGoogleOnboard} className="space-y-5">
              <div className="mb-6">
                <h2 className="font-bold text-foreground text-2xl">Complete seu cadastro</h2>
                <p className="text-muted-foreground text-sm mt-1">Só falta criar sua lanchonete!</p>
              </div>
              <div>
                <Label htmlFor="g-biz" className="text-sm font-medium mb-1.5 block">Nome da lanchonete</Label>
                <Input id="g-biz" placeholder="Ex: Burguer do João" value={googleBiz.name} onChange={(e) => handleGoogleBizNameChange(e.target.value)} className="h-11" required />
              </div>
              <div>
                <Label htmlFor="g-slug" className="text-sm font-medium mb-1.5 block">Slug (URL)</Label>
                <Input id="g-slug" value={googleBiz.slug} onChange={(e) => setGoogleBiz((p) => ({ ...p, slug: generateSlug(e.target.value) }))} className="h-11" required />
              </div>
              <div>
                <Label htmlFor="g-wpp" className="text-sm font-medium mb-1.5 block">WhatsApp (com DDD)</Label>
                <Input id="g-wpp" placeholder="11999999999" value={googleBiz.whatsapp} onChange={(e) => setGoogleBiz((p) => ({ ...p, whatsapp: e.target.value }))} className="h-11" required />
              </div>
              <Button type="submit" className="w-full h-11 font-semibold" disabled={googleOnboardLoading}>
                {googleOnboardLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Criar lanchonete
              </Button>
            </form>
          ) : (
          <Tabs defaultValue="signup">
            <TabsList className="w-full h-11 bg-muted/60 rounded-xl p-1 grid grid-cols-2 mb-8">
              <TabsTrigger
                value="signup"
                className="rounded-lg h-full text-sm font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                Criar conta
              </TabsTrigger>
              <TabsTrigger
                value="login"
                className="rounded-lg h-full text-sm font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                Entrar
              </TabsTrigger>
            </TabsList>

            {/* SIGNUP TAB */}
            <TabsContent value="signup" className="mt-0 space-y-5">
              <div className="mb-6">
                <h2 className="font-bold text-foreground text-2xl">Crie seu estabelecimento</h2>
                <p className="text-muted-foreground text-sm mt-1">Pronto em menos de 2 minutos</p>
              </div>
              <GoogleButton />
              <form onSubmit={handleSignup} className="space-y-4">
                {/* Dados pessoais */}
                <div>
                  <Label htmlFor="fullName" className="text-sm font-medium mb-1.5 block">
                    Seu nome completo
                  </Label>
                  <Input
                    id="fullName"
                    placeholder="João da Silva"
                    value={signupData.fullName}
                    onChange={(e) => setSignupData((p) => ({ ...p, fullName: e.target.value }))}
                    className="h-11"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="email" className="text-sm font-medium mb-1.5 block">
                    E-mail
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="joao@email.com"
                    value={signupData.email}
                    onChange={(e) => setSignupData((p) => ({ ...p, email: e.target.value }))}
                    className="h-11"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="confirmEmail" className="text-sm font-medium mb-1.5 block">
                    Confirme seu e-mail
                  </Label>
                  <Input
                    id="confirmEmail"
                    type="email"
                    placeholder="joao@email.com"
                    value={signupData.confirmEmail}
                    onChange={(e) => setSignupData((p) => ({ ...p, confirmEmail: e.target.value }))}
                    className="h-11"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="signup-pwd" className="text-sm font-medium mb-1.5 block">
                    Senha
                  </Label>
                  <div className="relative">
                    <Input
                      id="signup-pwd"
                      type={showSignupPwd ? "text" : "password"}
                      placeholder="Mínimo 6 caracteres"
                      value={signupData.password}
                      onChange={(e) => setSignupData((p) => ({ ...p, password: e.target.value }))}
                      className="h-11 pr-10"
                      minLength={6}
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => setShowSignupPwd((v) => !v)}
                    >
                      {showSignupPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="signup-confirm-pwd" className="text-sm font-medium mb-1.5 block">
                    Confirme sua senha
                  </Label>
                  <div className="relative">
                    <Input
                      id="signup-confirm-pwd"
                      type={showSignupConfirmPwd ? "text" : "password"}
                      placeholder="Repita a senha"
                      value={signupData.confirmPassword}
                      onChange={(e) => setSignupData((p) => ({ ...p, confirmPassword: e.target.value }))}
                      className="h-11 pr-10"
                      minLength={6}
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => setShowSignupConfirmPwd((v) => !v)}
                    >
                      {showSignupConfirmPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Dados do estabelecimento */}
                <div className="pt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-3 font-semibold uppercase tracking-wide">
                    Dados do estabelecimento
                  </p>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="businessName" className="text-sm font-medium mb-1.5 block">
                        Nome da lanchonete
                      </Label>
                      <Input
                        id="businessName"
                        placeholder="Burguer da Vila"
                        value={signupData.businessName}
                        onChange={(e) => handleBusinessNameChange(e.target.value)}
                        className="h-11"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="slug" className="text-sm font-medium mb-1.5 block">
                        URL pública
                      </Label>
                      <div className="flex items-center rounded-lg border border-input overflow-hidden focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 h-11">
                        <span className="px-3 text-xs text-muted-foreground bg-muted border-r border-input h-full flex items-center shrink-0 font-mono">
                          /u/
                        </span>
                        <input
                          id="slug"
                          className="flex-1 px-3 text-sm bg-background outline-none h-full"
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

                    {/* WhatsApp */}
                    <div>
                    <Label htmlFor="signup-whatsapp" className="text-sm font-medium mb-1.5 block">
                      WhatsApp para pedidos *
                      </Label>
                      <div className="flex items-center rounded-lg border border-input overflow-hidden focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 h-11">
                        <span className="px-3 text-xs text-muted-foreground bg-muted border-r border-input h-full flex items-center shrink-0">
                          +55
                        </span>
                        <input
                          id="signup-whatsapp"
                          className="flex-1 px-3 text-sm bg-background outline-none h-full"
                          placeholder="11999887766"
                          inputMode="numeric"
                          maxLength={11}
                          value={signupData.whatsapp}
                          onChange={(e) =>
                            setSignupData((p) => ({ ...p, whatsapp: e.target.value.replace(/\D/g, "") }))
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <Button type="submit" className="w-full h-11 text-base font-bold mt-2" disabled={signupLoading}>
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
              <div className="mb-6">
                <h2 className="font-bold text-foreground text-2xl">Bem-vindo de volta</h2>
                <p className="text-muted-foreground text-sm mt-1">Acesse seu painel de gestão</p>
              </div>
              <GoogleButton />
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label htmlFor="login-email" className="text-sm font-medium mb-1.5 block">
                    E-mail
                  </Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="joao@email.com"
                    value={loginData.email}
                    onChange={(e) => setLoginData((p) => ({ ...p, email: e.target.value }))}
                    className="h-11"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="login-pwd" className="text-sm font-medium mb-1.5 block">
                    Senha
                  </Label>
                  <div className="relative">
                    <Input
                      id="login-pwd"
                      type={showLoginPwd ? "text" : "password"}
                      placeholder="••••••••"
                      value={loginData.password}
                      onChange={(e) => setLoginData((p) => ({ ...p, password: e.target.value }))}
                      className="h-11 pr-10"
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => setShowLoginPwd((v) => !v)}
                    >
                      {showLoginPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full h-11 text-base font-bold mt-2" disabled={loginLoading}>
                  {loginLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Entrando...
                    </>
                  ) : (
                    "Entrar no painel"
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
          )}

          <p className="text-center text-xs text-muted-foreground mt-8">
            Ao criar sua conta, você concorda com nossos{" "}
            <span className="underline cursor-pointer hover:text-foreground transition-colors">Termos de Uso</span>.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
