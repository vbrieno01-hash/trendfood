import { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
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
  const { refreshOrganizationForUser } = useAuth();

  const redirectTo = searchParams.get("redirect") || "/dashboard";
  const planParam = searchParams.get("plan");
  const refParam = searchParams.get("ref") || null;
  const fullRedirect = planParam && redirectTo.includes("/planos")
    ? `${redirectTo}?plan=${planParam}`
    : redirectTo;

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

      if (authError) throw authError;
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
                        WhatsApp <span className="text-muted-foreground font-normal">(opcional)</span>
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
