import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ChefHat, Loader2, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const signUpSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Nome deve ter pelo menos 2 caracteres")
    .max(100, "Nome muito longo"),
  email: z.string().trim().email("E-mail inválido").max(255),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  businessName: z
    .string()
    .trim()
    .min(2, "Nome da lanchonete deve ter pelo menos 2 caracteres")
    .max(100, "Nome muito longo"),
  slug: z
    .string()
    .trim()
    .min(3, "Slug deve ter pelo menos 3 caracteres")
    .max(60, "Slug muito longo")
    .regex(slugRegex, "Use apenas letras minúsculas, números e hífens (sem espaços)"),
});

type SignUpFormData = z.infer<typeof signUpSchema>;

// Converts any text to a valid slug
function toSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

const SignUpPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const form = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      businessName: "",
      slug: "",
    },
  });

  const slugValue = form.watch("slug");

  // Auto-generate slug from business name
  const handleBusinessNameChange = (value: string) => {
    form.setValue("businessName", value);
    const currentSlug = form.getValues("slug");
    const generatedSlug = toSlug(form.getValues("businessName"));
    // Only auto-fill slug if it's empty or was auto-generated from a previous name
    if (!currentSlug || currentSlug === toSlug(value.slice(0, -1))) {
      form.setValue("slug", toSlug(value), { shouldValidate: false });
    }
  };

  const onSubmit = async (data: SignUpFormData) => {
    setLoading(true);
    try {
      // 1. Sign up user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: { full_name: data.fullName },
          emailRedirectTo: window.location.origin,
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Usuário não criado.");

      // 2. Insert organization
      const { error: orgError } = await supabase.from("organizations").insert({
        user_id: authData.user.id,
        slug: data.slug,
        name: data.businessName,
        emoji: "🍽️",
      });

      if (orgError) {
        if (orgError.code === "23505") {
          form.setError("slug", {
            message: "Este slug já está em uso. Tente outro.",
          });
          setLoading(false);
          return;
        }
        throw orgError;
      }

      toast.success("Estabelecimento criado com sucesso! 🎉", {
        description: "Bem-vindo ao TrendFood!",
      });

      navigate(`/unidade/${data.slug}/dashboard`);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Erro ao criar conta.";
      toast.error("Erro ao criar conta", { description: message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-secondary/30 flex flex-col items-center justify-center px-4 py-12">
      {/* Back to home */}
      <div className="w-full max-w-[420px] mb-4">
        <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground -ml-2">
          <Link to="/">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Voltar ao início
          </Link>
        </Button>
      </div>

      <Card className="w-full max-w-[420px] shadow-md">
        <CardHeader className="text-center pb-4">
          {/* Logo */}
          <div className="flex justify-center mb-3">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shadow-sm">
              <ChefHat className="w-6 h-6 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Criar conta grátis</CardTitle>
          <CardDescription>
            Cadastre seu estabelecimento e comece a ouvir seus clientes.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Full Name */}
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Completo</FormLabel>
                    <FormControl>
                      <Input placeholder="Maria Silva" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Email */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="maria@email.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Password */}
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Mínimo 6 caracteres" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Business Name */}
              <FormField
                control={form.control}
                name="businessName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome da Lanchonete</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Burguer do Zé"
                        {...field}
                        onChange={(e) => handleBusinessNameChange(e.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Slug */}
              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Slug da URL</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="burguer-do-ze"
                        {...field}
                        onChange={(e) =>
                          field.onChange(toSlug(e.target.value))
                        }
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      Sua página ficará em:{" "}
                      <span className="font-mono text-foreground">
                        /unidade/{slugValue || "seu-slug"}
                      </span>
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full mt-2" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Criando...
                  </>
                ) : (
                  "Criar minha conta"
                )}
              </Button>
            </form>
          </Form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Já tem uma conta?{" "}
            <Link to="/" className="text-primary font-medium hover:underline">
              Voltar ao início
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default SignUpPage;
