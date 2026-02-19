import { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ChefHat, Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";

const generateSlug = (name: string) =>
  name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");

// ─── Animated Dot Map Canvas ─────────────────────────────────────────────────
const DotMap = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const routes = [
    { start: { x: 100, y: 150 }, end: { x: 200, y: 80 }, delay: 0 },
    { start: { x: 200, y: 80 }, end: { x: 260, y: 120 }, delay: 2 },
    { start: { x: 50, y: 50 }, end: { x: 150, y: 180 }, delay: 1 },
    { start: { x: 280, y: 60 }, end: { x: 180, y: 180 }, delay: 0.5 },
  ];

  const generateDots = (width: number, height: number) => {
    const dots = [];
    const gap = 14;
    for (let x = 0; x < width; x += gap) {
      for (let y = 0; y < height; y += gap) {
        if (Math.random() > 0.4) {
          dots.push({ x, y, opacity: Math.random() * 0.45 + 0.1 });
        }
      }
    }
    return dots;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resizeObserver = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setDimensions({ width, height });
      canvas.width = width;
      canvas.height = height;
    });
    resizeObserver.observe(canvas.parentElement as Element);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (!dimensions.width || !dimensions.height) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dots = generateDots(dimensions.width, dimensions.height);
    let animationFrameId: number;
    let startTime = Date.now();

    function drawDots() {
      ctx!.clearRect(0, 0, dimensions.width, dimensions.height);
      dots.forEach((dot) => {
        ctx!.beginPath();
        ctx!.arc(dot.x, dot.y, 1.2, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(255, 180, 160, ${dot.opacity})`;
        ctx!.fill();
      });
    }

    function drawRoutes() {
      const currentTime = (Date.now() - startTime) / 1000;
      routes.forEach((route) => {
        const elapsed = currentTime - route.delay;
        if (elapsed <= 0) return;
        const progress = Math.min(elapsed / 3, 1);
        const x = route.start.x + (route.end.x - route.start.x) * progress;
        const y = route.start.y + (route.end.y - route.start.y) * progress;

        ctx!.beginPath();
        ctx!.moveTo(route.start.x, route.start.y);
        ctx!.lineTo(x, y);
        ctx!.strokeStyle = "rgba(255, 120, 100, 0.6)";
        ctx!.lineWidth = 1.5;
        ctx!.stroke();

        ctx!.beginPath();
        ctx!.arc(route.start.x, route.start.y, 3, 0, Math.PI * 2);
        ctx!.fillStyle = "rgba(255, 100, 80, 0.8)";
        ctx!.fill();

        ctx!.beginPath();
        ctx!.arc(x, y, 3.5, 0, Math.PI * 2);
        ctx!.fillStyle = "#fff";
        ctx!.fill();

        ctx!.beginPath();
        ctx!.arc(x, y, 7, 0, Math.PI * 2);
        ctx!.fillStyle = "rgba(255, 255, 255, 0.2)";
        ctx!.fill();
      });
    }

    function animate() {
      drawDots();
      drawRoutes();
      if ((Date.now() - startTime) / 1000 > 12) startTime = Date.now();
      animationFrameId = requestAnimationFrame(animate);
    }

    animate();
    return () => cancelAnimationFrame(animationFrameId);
  }, [dimensions]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ pointerEvents: "none" }}
    />
  );
};

// ─── Food emojis config ───────────────────────────────────────────────────────
const FOOD_EMOJIS = [
  { emoji: "🍔", top: "12%", left: "15%", delay: "0s", size: "1.8rem" },
  { emoji: "🍕", top: "25%", right: "12%", delay: "0.7s", size: "1.5rem" },
  { emoji: "🌮", top: "55%", left: "10%", delay: "1.3s", size: "1.6rem" },
  { emoji: "🍟", top: "70%", right: "18%", delay: "0.4s", size: "1.4rem" },
  { emoji: "🥤", top: "42%", left: "20%", delay: "1.8s", size: "1.5rem" },
  { emoji: "🍗", bottom: "18%", left: "40%", delay: "1.1s", size: "1.6rem" },
];

// ─── Main Component ───────────────────────────────────────────────────────────
const AuthPage = () => {
  const navigate = useNavigate();
  const { refreshOrganizationForUser } = useAuth();

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
    setSignupData((prev) => ({ ...prev, businessName: name, slug: generateSlug(name) }));
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
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

      await supabase.from("profiles").insert({ user_id: userId, full_name: signupData.fullName });

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
      await refreshOrganizationForUser(userId);
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
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* ── LEFT PANEL ─────────────────────────────────────────────────── */}
      <div
        className="relative hidden md:flex md:w-1/2 flex-col overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #7f1d1d 0%, #991b1b 40%, #450a0a 100%)",
        }}
      >
        {/* Dot map canvas */}
        <div className="absolute inset-0">
          <DotMap />
        </div>

        {/* Floating food emojis */}
        {FOOD_EMOJIS.map((item, i) => (
          <span
            key={i}
            className="absolute select-none"
            style={{
              top: item.top,
              left: (item as { left?: string }).left,
              right: (item as { right?: string }).right,
              bottom: (item as { bottom?: string }).bottom,
              fontSize: item.size,
              animation: `float 3s ease-in-out infinite alternate`,
              animationDelay: item.delay,
              opacity: 0.75,
            }}
          >
            {item.emoji}
          </span>
        ))}

        {/* Logo & headline overlay */}
        <div className="relative z-10 flex flex-col h-full p-10 justify-between">
          <div>
            <Link to="/" className="inline-flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                <ChefHat className="w-5 h-5 text-white" />
              </div>
              <span className="font-extrabold text-white text-xl tracking-tight">TrendFood</span>
            </Link>
          </div>

          <div className="space-y-4">
            <h1 className="text-3xl font-extrabold text-white leading-snug">
              Seu cardápio<br />
              <span className="text-red-200">gerenciado com</span><br />
              inteligência.
            </h1>
            <p className="text-red-100/80 text-sm leading-relaxed max-w-xs">
              Painel de vendas, cardápio digital, mesas e cozinha — tudo em um só lugar.
            </p>

            {/* Stats pills */}
            <div className="flex gap-3 pt-2">
              <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-xl px-4 py-2 text-center">
                <div className="text-white font-bold text-lg">+500</div>
                <div className="text-red-200 text-xs">Lanchonetes</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-xl px-4 py-2 text-center">
                <div className="text-white font-bold text-lg">R$ 0</div>
                <div className="text-red-200 text-xs">Para começar</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-xl px-4 py-2 text-center">
                <div className="text-white font-bold text-lg">2min</div>
                <div className="text-red-200 text-xs">Para ativar</div>
              </div>
            </div>
          </div>

          <p className="text-red-200/50 text-xs">© 2025 TrendFood. Todos os direitos reservados.</p>
        </div>
      </div>

      {/* ── RIGHT PANEL ────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center bg-background px-6 py-12 overflow-y-auto">
        {/* Mobile logo */}
        <div className="md:hidden mb-8 text-center">
          <Link to="/" className="inline-flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-md">
              <ChefHat className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-extrabold text-foreground text-lg">TrendFood</span>
          </Link>
        </div>

        <div className="w-full max-w-md">
          <div className="mb-6">
            <h2 className="text-2xl font-extrabold text-foreground">Boas-vindas 👋</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Entre na sua conta ou crie uma nova gratuitamente.
            </p>
          </div>

          <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
            <Tabs defaultValue="login">
              <TabsList className="w-full rounded-none border-b border-border h-12 bg-secondary/40 grid grid-cols-2">
                <TabsTrigger value="login" className="rounded-none h-full text-sm font-semibold">
                  Entrar
                </TabsTrigger>
                <TabsTrigger value="signup" className="rounded-none h-full text-sm font-semibold">
                  Criar conta
                </TabsTrigger>
              </TabsList>

              {/* ── LOGIN TAB ── */}
              <TabsContent value="login" className="p-6 space-y-4">
                <div className="text-center mb-2">
                  <h3 className="font-bold text-foreground text-lg">Bem-vindo de volta</h3>
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
                  <Button type="submit" className="w-full group" disabled={loginLoading}>
                    {loginLoading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Entrando...</>
                    ) : (
                      <>
                        Entrar no painel
                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>

              {/* ── SIGNUP TAB ── */}
              <TabsContent value="signup" className="p-6 space-y-4">
                <div className="text-center mb-2">
                  <h3 className="font-bold text-foreground text-lg">Crie seu estabelecimento</h3>
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

                  <Button type="submit" className="w-full group" disabled={signupLoading}>
                    {signupLoading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Criando conta...</>
                    ) : (
                      <>
                        Criar minha conta grátis
                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-6">
            Ao criar sua conta, você concorda com nossos{" "}
            <span className="underline cursor-pointer">Termos de Uso</span>.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
