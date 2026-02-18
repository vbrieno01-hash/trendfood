import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ChefHat, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

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

  // Sign up state
  const [signupData, setSignupData] = useState({
    fullName: "",
    email: "",
    password: "",
    businessName: "",
    slug: "",
  });
  const [signupLoading, setSignupLoading] = useState(false);
  const [showSignupPwd, setShowSignupPwd] = useState(false);

  // Login state
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
    if (!signupData.slug.trim()) {
      toast.error("Informe o slug da sua lanchonete.");
      return;
    }
    setSignupLoading(true);

    try {
      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: signupData.email,
        password: signupData.password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Usuário não criado.");

      const userId = authData.user.id;

      // 2. Insert profile
      await supabase.from("profiles").insert({
        user_id: userId,
        full_name: signupData.fullName,
      });

      // 3. Insert organization
      const { error: orgError } = await supabase.from("organizations").insert({
        user_id: userId,
        name: signupData.businessName,
        slug: signupData.slug,
        emoji: "🍔",
        description: "Bem-vindo ao nosso mural de sugestões!",
        primary_color: "#f97316",
      });

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
      navigate("/dashboard");
    } catch (err: unknown) {
      const error = err as { message?: string };
      toast.error(error.message ?? "Erro ao criar conta.");
    } finally {
      setSignupLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginData.email,
        password: loginData.password,
      });
      if (error) throw error;
      toast.success("Login realizado com sucesso!");
      navigate("/dashboard");
    } catch (err: unknown) {
      const error = err as { message?: string };
      toast.error(error.message ?? "E-mail ou senha incorretos.");
    } finally {
      setLoginLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
              <ChefHat className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-extrabold text-foreground text-xl">TrendFood</span>
          </Link>
          <p className="text-muted-foreground text-sm mt-2">Seu mural de sugestões para lanchonetes</p>
        </div>

        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          <Tabs defaultValue="signup">
            <TabsList className="w-full rounded-none border-b border-border h-12 bg-secondary/40 grid grid-cols-2">
              <TabsTrigger value="signup" className="rounded-none h-full text-sm font-semibold">
                Criar conta
              </TabsTrigger>
              <TabsTrigger value="login" className="rounded-none h-full text-sm font-semibold">
                Entrar
              </TabsTrigger>
            </TabsList>

            {/* SIGNUP TAB */}
            <TabsContent value="signup" className="p-6 space-y-4">
              <div className="text-center mb-2">
                <h2 className="font-bold text-foreground text-lg">Crie seu estabelecimento</h2>
                <p className="text-muted-foreground text-sm">Pronto em menos de 2 minutos</p>
              </div>
              <form onSubmit={handleSignup} className="space-y-4">
                <div>
                  <Label htmlFor="fullName" className="text-sm font-medium">Seu nome completo</Label>
                  <Input
                    id="fullName"
                    placeholder="João da Silva"
                    value={signupData.fullName}
                    onChange={(e) => setSignupData((p) => ({ ...p, fullName: e.target.value }))}
                    className="mt-1"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="email" className="text-sm font-medium">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="joao@email.com"
                    value={signupData.email}
                    onChange={(e) => setSignupData((p) => ({ ...p, email: e.target.value }))}
                    className="mt-1"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="signup-pwd" className="text-sm font-medium">Senha</Label>
                  <div className="relative mt-1">
                    <Input
                      id="signup-pwd"
                      type={showSignupPwd ? "text" : "password"}
                      placeholder="Mínimo 6 caracteres"
                      value={signupData.password}
                      onChange={(e) => setSignupData((p) => ({ ...p, password: e.target.value }))}
                      minLength={6}
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowSignupPwd((v) => !v)}
                    >
                      {showSignupPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-3 font-medium">Dados do seu estabelecimento</p>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="businessName" className="text-sm font-medium">Nome da lanchonete</Label>
                      <Input
                        id="businessName"
                        placeholder="Burguer da Vila"
                        value={signupData.businessName}
                        onChange={(e) => handleBusinessNameChange(e.target.value)}
                        className="mt-1"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="slug" className="text-sm font-medium">Slug (URL pública)</Label>
                      <div className="flex items-center mt-1 rounded-md border border-input overflow-hidden focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                        <span className="px-3 py-2 text-xs text-muted-foreground bg-secondary border-r border-input shrink-0">
                          /unidade/
                        </span>
                        <input
                          id="slug"
                          className="flex-1 px-3 py-2 text-sm bg-background outline-none"
                          placeholder="burguer-da-vila"
                          value={signupData.slug}
                          onChange={(e) =>
                            setSignupData((p) => ({ ...p, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") }))
                          }
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={signupLoading}>
                  {signupLoading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Criando conta...</>
                  ) : (
                    "Criar minha conta grátis"
                  )}
                </Button>
              </form>
            </TabsContent>

            {/* LOGIN TAB */}
            <TabsContent value="login" className="p-6 space-y-4">
              <div className="text-center mb-2">
                <h2 className="font-bold text-foreground text-lg">Bem-vindo de volta</h2>
                <p className="text-muted-foreground text-sm">Acesse seu painel</p>
              </div>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label htmlFor="login-email" className="text-sm font-medium">E-mail</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="joao@email.com"
                    value={loginData.email}
                    onChange={(e) => setLoginData((p) => ({ ...p, email: e.target.value }))}
                    className="mt-1"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="login-pwd" className="text-sm font-medium">Senha</Label>
                  <div className="relative mt-1">
                    <Input
                      id="login-pwd"
                      type={showLoginPwd ? "text" : "password"}
                      placeholder="••••••••"
                      value={loginData.password}
                      onChange={(e) => setLoginData((p) => ({ ...p, password: e.target.value }))}
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowLoginPwd((v) => !v)}
                    >
                      {showLoginPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loginLoading}>
                  {loginLoading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Entrando...</>
                  ) : (
                    "Entrar no painel"
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Ao criar sua conta, você concorda com nossos Termos de Uso.
        </p>
      </div>
    </div>
  );
};

export default AuthPage;
