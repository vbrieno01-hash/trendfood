import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, Loader2, Copy, Check, X, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import BusinessHoursSection, { DEFAULT_BUSINESS_HOURS } from "@/components/dashboard/BusinessHoursSection";
import { BusinessHours } from "@/hooks/useOrganization";
import { DeliveryConfig, DEFAULT_DELIVERY_CONFIG } from "@/hooks/useDeliveryFee";

interface Organization {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  emoji: string;
  primary_color: string;
  logo_url: string | null;
  whatsapp?: string | null;
  business_hours?: BusinessHours | null;
  pix_key?: string | null;
  store_address?: string | null;
  delivery_config?: DeliveryConfig | null;
  pix_confirmation_mode?: "direct" | "manual" | "automatic";
  banner_url?: string | null;
}


const EMOJI_OPTIONS = ["🍔", "🌮", "🍕", "🍜", "🌯", "🥪", "🍗", "🥗", "🍣", "🥩", "🍟", "🧆"];

const BRAZIL_STATES = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"
];

import { AddressFields, EMPTY_ADDRESS, buildStoreAddress, parseStoreAddress } from "@/lib/storeAddress";
import { compressImage } from "@/lib/compressImage";

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground shrink-0">{children}</p>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

export default function StoreProfileTab({ organization }: { organization: Organization }) {
  const { refreshOrganization, user, organizations } = useAuth();
  const [deliveryConfig, setDeliveryConfig] = useState<DeliveryConfig>({
    ...DEFAULT_DELIVERY_CONFIG,
    ...(organization.delivery_config ?? undefined),
  });
  const [form, setForm] = useState({
    name: organization.name,
    description: organization.description ?? "",
    emoji: organization.emoji,
    slug: organization.slug,
    primary_color: organization.primary_color,
    whatsapp: organization.whatsapp ?? "",
    pix_key: organization.pix_key ?? "",
    store_address: organization.store_address ?? "",
    pix_confirmation_mode: organization.pix_confirmation_mode ?? "direct",
  });
  const [businessHours, setBusinessHours] = useState<BusinessHours>(
    organization.business_hours ?? DEFAULT_BUSINESS_HOURS
  );
  const [addressFields, setAddressFields] = useState<AddressFields>(
    organization.store_address ? parseStoreAddress(organization.store_address) : { ...EMPTY_ADDRESS }
  );
  const [cepFetching, setCepFetching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoRemoving, setLogoRemoving] = useState(false);
  const [logoUrl, setLogoUrl] = useState(organization.logo_url);
  const [bannerUploading, setBannerUploading] = useState(false);
  const [bannerRemoving, setBannerRemoving] = useState(false);
  const [bannerUrl, setBannerUrl] = useState(organization.banner_url ?? null);
  const [copied, setCopied] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [gatewayProvider, setGatewayProvider] = useState("");
  const [gatewayToken, setGatewayToken] = useState("");
  const [secretsLoading, setSecretsLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const bannerFileRef = useRef<HTMLInputElement>(null);

  // Load existing gateway secrets
  useEffect(() => {
    const loadSecrets = async () => {
      setSecretsLoading(true);
      const { data } = await supabase
        .from("organization_secrets" as any)
        .select("pix_gateway_provider, pix_gateway_token")
        .eq("organization_id", organization.id)
        .maybeSingle();
      if (data) {
        setGatewayProvider((data as any).pix_gateway_provider || "");
        setGatewayToken((data as any).pix_gateway_token || "");
      }
      setSecretsLoading(false);
    };
    loadSecrets();
  }, [organization.id]);

  const PUBLIC_BASE_URL = "https://trendfood.lovable.app";
  const publicUrl = `${PUBLIC_BASE_URL}/unidade/${form.slug}`;

  // Helper: update shared fields across ALL user orgs (except current which is updated separately)
  const updateAllOrgs = async (sharedFields: Record<string, any>) => {
    if (!user) return;
    const otherOrgIds = organizations.filter((o) => o.id !== organization.id).map((o) => o.id);
    if (otherOrgIds.length === 0) return;
    await supabase
      .from("organizations")
      .update(sharedFields)
      .in("id", otherOrgIds);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const sharedFields = {
        emoji: form.emoji,
        primary_color: form.primary_color,
        whatsapp: form.whatsapp || null,
        pix_key: form.pix_key || null,
        pix_confirmation_mode: form.pix_confirmation_mode,
        business_hours: businessHours as unknown as never,
        store_address: buildStoreAddress(addressFields) || null,
        delivery_config: deliveryConfig as unknown as never,
      };

      const { error } = await supabase
        .from("organizations")
        .update({
          name: form.name,
          description: form.description || null,
          slug: form.slug,
          ...sharedFields,
        })
        .eq("id", organization.id);

      if (error) {
        if (error.code === "23505") {
          toast.error("Este slug já está em uso. Escolha outro.");
        } else {
          throw error;
        }
        return;
      }

      // Replicate shared fields to all other orgs
      await updateAllOrgs(sharedFields);

      // Save gateway secrets if automatic mode
      if (form.pix_confirmation_mode === "automatic" && gatewayProvider && gatewayToken) {
        const { data: existing } = await supabase
          .from("organization_secrets" as any)
          .select("id")
          .eq("organization_id", organization.id)
          .maybeSingle();

        if (existing) {
          await supabase
            .from("organization_secrets" as any)
            .update({
              pix_gateway_provider: gatewayProvider,
              pix_gateway_token: gatewayToken,
            } as any)
            .eq("organization_id", organization.id);
        } else {
          await supabase
            .from("organization_secrets" as any)
            .insert({
              organization_id: organization.id,
              pix_gateway_provider: gatewayProvider,
              pix_gateway_token: gatewayToken,
            } as any);
        }
      }

      await refreshOrganization();
      toast.success("Perfil da loja atualizado!");
    } catch {
      toast.error("Erro ao salvar perfil.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;
      setLogoUploading(true);
      const compressed = await compressImage(file, { maxWidth: 800, maxHeight: 800 });
      const ext = compressed.name.split(".").pop();
      const path = `${organization.id}/logo.${ext}`;
      const { error: uploadError } = await supabase.storage.from("logos").upload(path, compressed, { upsert: true });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("logos").getPublicUrl(path);
      const url = data.publicUrl + `?t=${Date.now()}`;
      setLogoUrl(url);
      await supabase.from("organizations").update({ logo_url: url }).eq("id", organization.id);
      await updateAllOrgs({ logo_url: url });
      await refreshOrganization();
      toast.success("Logo atualizado!");
    } catch (err) {
      console.error("[StoreProfile] Logo upload error:", err);
      toast.error("Erro ao fazer upload do logo.");
    } finally {
      setLogoUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleRemoveLogo = async () => {
    setLogoRemoving(true);
    try {
      await supabase.from("organizations").update({ logo_url: null }).eq("id", organization.id);
      await updateAllOrgs({ logo_url: null });
      setLogoUrl(null);
      await refreshOrganization();
      toast.success("Logo removido.");
    } catch {
      toast.error("Erro ao remover logo.");
    } finally {
      setLogoRemoving(false);
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;
      setBannerUploading(true);
      const compressed = await compressImage(file, { maxWidth: 1200, maxHeight: 800 });
      const ext = compressed.name.split(".").pop();
      const path = `banners/${organization.id}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("menu-images").upload(path, compressed, { upsert: true });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("menu-images").getPublicUrl(path);
      const url = data.publicUrl + `?t=${Date.now()}`;
      setBannerUrl(url);
      await supabase.from("organizations").update({ banner_url: url } as any).eq("id", organization.id);
      await updateAllOrgs({ banner_url: url });
      await refreshOrganization();
      toast.success("Banner atualizado!");
    } catch (err) {
      console.error("[StoreProfile] Banner upload error:", err);
      toast.error("Erro ao fazer upload do banner.");
    } finally {
      setBannerUploading(false);
      if (bannerFileRef.current) bannerFileRef.current.value = "";
    }
  };

  const handleRemoveBanner = async () => {
    setBannerRemoving(true);
    try {
      await supabase.from("organizations").update({ banner_url: null } as any).eq("id", organization.id);
      await updateAllOrgs({ banner_url: null });
      setBannerUrl(null);
      await refreshOrganization();
      toast.success("Banner removido.");
    } catch {
      toast.error("Erro ao remover banner.");
    } finally {
      setBannerRemoving(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Link copiado!");
  };

  const fetchCep = async (cep: string) => {
    const cleaned = cep.replace(/\D/g, "");
    if (cleaned.length !== 8) return;
    setCepFetching(true);
    try {
      const { data, error: proxyError } = await supabase.functions.invoke("viacep-proxy", { body: { cep: cleaned } });
      if (proxyError || data?.error) {
        toast.error(data?.error || "CEP não encontrado.");
        return;
      }
      setAddressFields((p) => ({
        ...p,
        street: data.logradouro ?? p.street,
        neighborhood: data.bairro ?? p.neighborhood,
        city: data.localidade ?? p.city,
        state: data.uf ?? p.state,
      }));
    } catch {
      toast.error("Erro ao buscar CEP.");
    } finally {
      setCepFetching(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-8 max-w-lg">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Perfil da Loja</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Personalize como sua lanchonete aparece para os clientes</p>
      </div>

      {/* ── SEÇÃO 1: Identidade ────────────────────────────────────────── */}
      <div>
        <SectionHeader>Identidade</SectionHeader>

        {/* Logo */}
        <div className="mb-5">
          <Label className="text-sm font-medium mb-2 block">Logo</Label>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl border border-border bg-secondary overflow-hidden flex items-center justify-center shrink-0">
              {logoUploading ? (
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              ) : logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl">{form.emoji}</span>
              )}
            </div>
            <div className="space-y-1.5">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileRef.current?.click()}
                  disabled={logoUploading || logoRemoving}
                  className="gap-2"
                >
                  <Camera className="w-4 h-4" />
                  {logoUploading ? "Enviando..." : "Alterar logo"}
                </Button>
                {logoUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveLogo}
                    disabled={logoUploading || logoRemoving}
                    className="gap-1.5 text-muted-foreground hover:text-destructive"
                  >
                    {logoRemoving ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                    Remover
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">JPG, PNG ou WebP. Máx 2MB.</p>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
            </div>
          </div>
        </div>

        {/* Banner */}
        <div className="mb-5">
          <Label className="text-sm font-medium mb-2 block">Banner</Label>
          <div className="space-y-2">
            {bannerUrl ? (
              <img src={bannerUrl} alt="Banner" className="w-full rounded-xl object-cover" style={{ maxHeight: 160 }} />
            ) : (
              <div className="w-full h-24 rounded-xl border-2 border-dashed border-border bg-secondary/50 flex items-center justify-center text-muted-foreground text-sm">
                Nenhum banner
              </div>
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => bannerFileRef.current?.click()}
                disabled={bannerUploading}
                className="gap-2"
              >
                <Camera className="w-4 h-4" />
                {bannerUploading ? "Enviando..." : bannerUrl ? "Trocar banner" : "Adicionar banner"}
              </Button>
              {bannerUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveBanner}
                  disabled={bannerRemoving}
                  className="gap-1.5 text-muted-foreground hover:text-destructive"
                >
                  {bannerRemoving ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                  Remover
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Imagem paisagem recomendada (1200×400). Máx 2MB.</p>
            <input ref={bannerFileRef} type="file" accept="image/*" className="hidden" onChange={handleBannerUpload} />
          </div>
        </div>

        {/* Emoji — horizontal scroll, botões menores */}
        <div className="mb-5">
          <Label className="text-sm font-medium mb-2 block">Emoji da loja</Label>
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
            {EMOJI_OPTIONS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setForm((p) => ({ ...p, emoji: e }))}
                className={`text-xl w-9 h-9 rounded-lg border shrink-0 transition-all ${
                  form.emoji === e
                    ? "border-primary bg-primary/10 scale-110"
                    : "border-border hover:border-primary/50 bg-card"
                }`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        {/* Name */}
        <div className="mb-5">
          <Label htmlFor="store-name" className="text-sm font-medium">Nome da lanchonete</Label>
          <Input
            id="store-name"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            className="mt-1"
            required
          />
        </div>

        {/* Description */}
        <div>
          <Label htmlFor="store-desc" className="text-sm font-medium">Descrição</Label>
          <Textarea
            id="store-desc"
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            placeholder="Ex: Os melhores burguers artesanais da cidade!"
            className="mt-1 resize-none"
            rows={2}
          />
        </div>
      </div>

      {/* ── SEÇÃO 2: URL e Cor ────────────────────────────────────────── */}
      <div>
        <SectionHeader>URL e Cor</SectionHeader>

        {/* Slug */}
        <div className="mb-5">
          <Label htmlFor="store-slug" className="text-sm font-medium">Slug (URL pública)</Label>
          <div className="flex items-center mt-1 rounded-md border border-input overflow-hidden focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
            <span className="px-3 py-2 text-xs text-muted-foreground bg-secondary border-r border-input shrink-0">
              /unidade/
            </span>
            <input
              id="store-slug"
              className="flex-1 px-3 py-2 text-sm bg-background outline-none"
              value={form.slug}
              onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") }))}
              required
            />
          </div>
        </div>

        {/* Link copy */}
        <div className="mb-5 bg-secondary/50 rounded-xl p-3 flex items-center gap-2">
          <code className="flex-1 text-xs text-foreground truncate">{publicUrl}</code>
          <Button type="button" size="sm" variant="outline" onClick={handleCopyLink} className="gap-1.5 shrink-0 h-8">
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copiado!" : "Copiar"}
          </Button>
        </div>

        {/* Primary color */}
        <div>
          <Label className="text-sm font-medium">Cor primária do mural público</Label>
          <div className="flex items-center gap-3 mt-2 mb-3">
            <input
              type="color"
              value={form.primary_color}
              onChange={(e) => setForm((p) => ({ ...p, primary_color: e.target.value }))}
              className="h-9 w-14 rounded-lg border border-border cursor-pointer"
            />
            <Input
              value={form.primary_color}
              onChange={(e) => setForm((p) => ({ ...p, primary_color: e.target.value }))}
              className="w-32 h-9"
              placeholder="#f97316"
            />
          </div>

          {/* Live color preview */}
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="h-10 flex items-center px-4" style={{ backgroundColor: form.primary_color }}>
              <span className="text-white text-sm font-bold drop-shadow">{form.name || "Minha Lanchonete"}</span>
            </div>
            <div className="bg-card p-3 flex items-center gap-3">
              <button
                type="button"
                className="text-xs px-3 py-1.5 rounded-full text-white font-semibold"
                style={{ backgroundColor: form.primary_color }}
              >
                Pedir agora
              </button>
              <button
                type="button"
                className="text-xs px-3 py-1.5 rounded-full font-semibold border-2"
                style={{ color: form.primary_color, borderColor: form.primary_color }}
              >
                Ver cardápio
              </button>
              <p className="text-xs text-muted-foreground ml-auto">Preview</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── SEÇÃO 3: Contato ──────────────────────────────────────────── */}
      <div>
        <SectionHeader>Contato</SectionHeader>

        <div>
          <Label htmlFor="store-whatsapp" className="text-sm font-medium">
            WhatsApp para pedidos <span className="text-muted-foreground font-normal">(opcional)</span>
          </Label>
          <div className="flex items-center mt-1 rounded-md border border-input overflow-hidden focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
            <span className="px-3 py-2 text-xs text-muted-foreground bg-secondary border-r border-input shrink-0">
              +55
            </span>
            <input
              id="store-whatsapp"
              className="flex-1 px-3 py-2 text-sm bg-background outline-none"
              value={form.whatsapp}
              inputMode="numeric"
              onChange={(e) => setForm((p) => ({ ...p, whatsapp: e.target.value.replace(/\D/g, "") }))}
              placeholder="11999887766"
              maxLength={11}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">Ativa o botão "Pedir no WhatsApp" na página pública.</p>
        </div>
      </div>

      {/* ── SEÇÃO 4: Pagamentos ───────────────────────────────────────── */}
      <div>
        <SectionHeader>Pagamentos</SectionHeader>

        <div>
          <Label htmlFor="store-pix" className="text-sm font-medium">
            Chave PIX <span className="text-muted-foreground font-normal">(opcional)</span>
          </Label>
          <Input
            id="store-pix"
            value={form.pix_key}
            onChange={(e) => setForm((p) => ({ ...p, pix_key: e.target.value.trim() }))}
            placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória"
            className="mt-1"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Quando cadastrada, o QR Code PIX com o valor total aparece automaticamente no comprovante de impressão.
          </p>
        </div>

        {/* PIX Confirmation Mode */}
        <div className="mt-5">
          <Label className="text-sm font-medium">Confirmação do PIX</Label>
          <p className="text-xs text-muted-foreground mt-0.5 mb-3">
            Escolha como funciona a confirmação do pagamento PIX antes de enviar o pedido para a cozinha.
          </p>
          <div className="space-y-2">
            {/* Direto */}
            <label
              className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                form.pix_confirmation_mode === "direct"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/30"
              }`}
            >
              <input
                type="radio"
                name="pix_mode"
                value="direct"
                checked={form.pix_confirmation_mode === "direct"}
                onChange={() => setForm((p) => ({ ...p, pix_confirmation_mode: "direct" }))}
                className="mt-0.5"
              />
              <div>
                <p className="text-sm font-semibold text-foreground">⚡ Direto</p>
                <p className="text-xs text-muted-foreground">O pedido vai direto pra cozinha. O PIX é apenas informativo.</p>
              </div>
            </label>

            {/* Manual */}
            <label
              className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                form.pix_confirmation_mode === "manual"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/30"
              }`}
            >
              <input
                type="radio"
                name="pix_mode"
                value="manual"
                checked={form.pix_confirmation_mode === "manual"}
                onChange={() => setForm((p) => ({ ...p, pix_confirmation_mode: "manual" }))}
                className="mt-0.5"
              />
              <div>
                <p className="text-sm font-semibold text-foreground">👋 Manual</p>
                <p className="text-xs text-muted-foreground">O pedido fica aguardando até você confirmar que o PIX caiu. Só depois vai pra cozinha.</p>
              </div>
            </label>

            {/* Automático */}
            <label
              className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                form.pix_confirmation_mode === "automatic"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/30"
              }`}
            >
              <input
                type="radio"
                name="pix_mode"
                value="automatic"
                checked={form.pix_confirmation_mode === "automatic"}
                onChange={() => setForm((p) => ({ ...p, pix_confirmation_mode: "automatic" }))}
                className="mt-0.5"
              />
              <div>
                <p className="text-sm font-semibold text-foreground">🤖 Automático (API)</p>
                <p className="text-xs text-muted-foreground">Integrado com gateway de pagamento para verificar automaticamente.</p>
              </div>
            </label>
          </div>

          {/* Gateway config — shown when automatic mode is selected */}
          {form.pix_confirmation_mode === "automatic" && (
            <div className="mt-4 p-4 bg-secondary/50 rounded-xl border border-border space-y-4">
              <p className="text-sm font-semibold text-foreground">⚙️ Configuração do Gateway</p>

              {secretsLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" /> Carregando...
                </div>
              ) : (
                <>
                  <div>
                    <Label className="text-xs font-medium mb-1 block">Provedor</Label>
                    <Select value={gatewayProvider} onValueChange={setGatewayProvider}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o gateway" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mercadopago">Mercado Pago</SelectItem>
                        <SelectItem value="pagseguro">PagSeguro / PagBank</SelectItem>
                        <SelectItem value="efi">EFI (Gerencianet)</SelectItem>
                        <SelectItem value="asaas">Asaas</SelectItem>
                        <SelectItem value="openpix">OpenPix (Woovi)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs font-medium mb-1 block">Access Token</Label>
                    <div className="relative">
                      <Input
                        type={showToken ? "text" : "password"}
                        value={gatewayToken}
                        onChange={(e) => setGatewayToken(e.target.value)}
                        placeholder={
                          gatewayProvider === "mercadopago"
                            ? "APP_USR-..."
                            : gatewayProvider === "pagseguro"
                            ? "Token PagSeguro"
                            : gatewayProvider === "efi"
                            ? "Client ID e Secret (formato: clientId:clientSecret)"
                            : gatewayProvider === "asaas"
                            ? "$aact_..."
                            : gatewayProvider === "openpix"
                            ? "AppID da OpenPix"
                            : gatewayProvider
                            ? "Token/credencial do seu banco"
                            : "Selecione o provedor primeiro"
                        }
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowToken(!showToken)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {gatewayProvider === "mercadopago" && (
                    <p className="text-xs text-muted-foreground">
                      Encontre seu Access Token em{" "}
                      <a href="https://www.mercadopago.com.br/developers/panel/app" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                        Mercado Pago Developers → Credenciais
                      </a>
                    </p>
                  )}
                  {gatewayProvider === "pagseguro" && (
                    <p className="text-xs text-muted-foreground">
                      Encontre seu token em{" "}
                      <a href="https://minhaconta.pagseguro.uol.com.br/minha-conta/configuracoes" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                        PagSeguro → Minha Conta → Configurações
                      </a>
                    </p>
                  )}
                  {gatewayProvider === "efi" && (
                    <p className="text-xs text-muted-foreground">
                      Crie suas credenciais em{" "}
                      <a href="https://app.gerencianet.com.br/api/minhas-aplicacoes" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                        EFI → API → Minhas Aplicações
                      </a>
                      . Formato: <code className="text-xs">clientId:clientSecret</code>
                    </p>
                  )}
                  {gatewayProvider === "asaas" && (
                    <p className="text-xs text-muted-foreground">
                      Gere sua API Key em{" "}
                      <a href="https://www.asaas.com/customerApiKeys/index" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                        Asaas → Integrações → API
                      </a>
                    </p>
                  )}
                  {gatewayProvider === "openpix" && (
                    <p className="text-xs text-muted-foreground">
                      Crie seu AppID em{" "}
                      <a href="https://app.openpix.com.br/home/applications" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                        OpenPix → Aplicações
                      </a>
                    </p>
                  )}
                  {["inter", "sicredi", "bradesco", "itau", "bb", "santander", "caixa", "nubank", "c6bank", "shipay"].includes(gatewayProvider) && (
                    <p className="text-xs text-amber-600">
                      ⚠️ Integração com este provedor em desenvolvimento. Use Mercado Pago, PagSeguro, EFI, Asaas ou OpenPix.
                    </p>
                  )}

                  {!gatewayProvider || !gatewayToken ? (
                    <p className="text-xs text-amber-600 font-medium">
                      ⚠️ Selecione o provedor e cole o token para ativar a verificação automática.
                    </p>
                  ) : (
                    <p className="text-xs text-green-600 font-medium">
                      ✅ Gateway configurado! Os pedidos PIX serão verificados automaticamente.
                    </p>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── SEÇÃO 5: Entrega e Frete ──────────────────────────────── */}
      <div>
        <SectionHeader>Entrega e Frete</SectionHeader>

        {/* Alerta quando endereço não configurado */}
        {!addressFields.cep && !addressFields.street && (
          <Alert className="mb-4 border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-800 dark:text-amber-400">Endereço não configurado</AlertTitle>
            <AlertDescription className="text-amber-700 dark:text-amber-500">
              Configure o endereço da sua loja para ativar o cálculo automático de frete nas entregas.
            </AlertDescription>
          </Alert>
        )}

        {/* CEP + auto-fill */}
        <div className="mb-4">
          <Label className="text-sm font-medium">
            Endereço da loja <span className="text-muted-foreground font-normal">(origem do cálculo de frete)</span>
          </Label>
          <p className="text-xs text-muted-foreground mt-0.5 mb-3">
            Preencha o CEP para preenchimento automático. Usado para calcular o frete até o cliente.
          </p>

          {/* CEP row */}
          <div className="mb-3">
            <Label htmlFor="addr-cep" className="text-xs font-medium mb-1 block">CEP *</Label>
            <div className="relative">
              <Input
                id="addr-cep"
                value={addressFields.cep}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "").slice(0, 8);
                  const formatted = v.length > 5 ? `${v.slice(0, 5)}-${v.slice(5)}` : v;
                  setAddressFields((p) => ({ ...p, cep: formatted }));
                  if (v.length === 8) fetchCep(formatted);
                }}
                onBlur={(e) => fetchCep(e.target.value)}
                placeholder="00000-000"
                inputMode="numeric"
                className={`font-mono ${cepFetching ? "pr-9" : ""}`}
              />
              {cepFetching && <Loader2 className="w-4 h-4 animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />}
            </div>
          </div>

          {/* Street + Number */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="col-span-2">
              <Label htmlFor="addr-street" className="text-xs font-medium mb-1 block">Logradouro *</Label>
              <Input
                id="addr-street"
                value={addressFields.street}
                onChange={(e) => setAddressFields((p) => ({ ...p, street: e.target.value }))}
                placeholder="Rua, Av., etc."
              />
            </div>
            <div>
              <Label htmlFor="addr-number" className="text-xs font-medium mb-1 block">Número *</Label>
              <Input
                id="addr-number"
                value={addressFields.number}
                onChange={(e) => setAddressFields((p) => ({ ...p, number: e.target.value }))}
                placeholder="123"
              />
            </div>
          </div>

          {/* Complement */}
          <div className="mb-3">
            <Label htmlFor="addr-complement" className="text-xs font-medium mb-1 block">
              Complemento <span className="text-muted-foreground font-normal">(opcional)</span>
            </Label>
            <Input
              id="addr-complement"
              value={addressFields.complement}
              onChange={(e) => setAddressFields((p) => ({ ...p, complement: e.target.value }))}
              placeholder="Apto, Sala, Bloco..."
            />
          </div>

          {/* Neighborhood + City */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div>
              <Label htmlFor="addr-neighborhood" className="text-xs font-medium mb-1 block">
                Bairro <span className="text-muted-foreground font-normal">(opcional)</span>
              </Label>
              <Input
                id="addr-neighborhood"
                value={addressFields.neighborhood}
                onChange={(e) => setAddressFields((p) => ({ ...p, neighborhood: e.target.value }))}
                placeholder="Centro"
              />
            </div>
            <div>
              <Label htmlFor="addr-city" className="text-xs font-medium mb-1 block">Cidade *</Label>
              <Input
                id="addr-city"
                value={addressFields.city}
                onChange={(e) => setAddressFields((p) => ({ ...p, city: e.target.value }))}
                placeholder="Cubatão"
              />
            </div>
          </div>

          {/* State */}
          <div className="w-32">
            <Label className="text-xs font-medium mb-1 block">Estado *</Label>
            <Select
              value={addressFields.state}
              onValueChange={(v) => setAddressFields((p) => ({ ...p, state: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="UF" />
              </SelectTrigger>
              <SelectContent>
                {BRAZIL_STATES.map((uf) => (
                  <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Preview string */}
          {buildStoreAddress(addressFields) && (
            <div className="mt-3 bg-secondary/50 rounded-lg px-3 py-2">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Endereço salvo: </span>
                {buildStoreAddress(addressFields)}
              </p>
            </div>
          )}
        </div>


        {/* Taxas de frete editáveis por loja */}
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Taxas de Frete</p>
          <div className="grid grid-cols-2 gap-3">
            {([
              { key: "fee_1km" as const, label: "Até 1 km" },
              { key: "fee_2km" as const, label: "Até 2 km" },
              { key: "fee_3km" as const, label: "Até 3 km" },
              { key: "fee_4km" as const, label: "Até 4 km" },
              { key: "fee_5km" as const, label: "Acima de 4 km" },
              { key: "free_above" as const, label: "Frete grátis acima de" },
            ]).map((f) => (
              <div key={f.key}>
                <Label className="text-xs font-medium mb-1 block">{f.label}</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                  <Input
                    type="number"
                    min={0}
                    step={0.5}
                    value={deliveryConfig[f.key]}
                    onChange={(e) => setDeliveryConfig((p) => ({ ...p, [f.key]: parseFloat(e.target.value) || 0 }))}
                    className="pl-9"
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="bg-secondary/60 rounded-xl p-3 text-xs space-y-1 mt-3">
            <p className="font-semibold text-foreground mb-1">Preview:</p>
            <p className="text-muted-foreground">📍 Até <strong>1 km</strong> → <strong className="text-foreground">R$ {deliveryConfig.fee_1km.toFixed(2).replace(".", ",")}</strong></p>
            <p className="text-muted-foreground">📍 Até <strong>2 km</strong> → <strong className="text-foreground">R$ {deliveryConfig.fee_2km.toFixed(2).replace(".", ",")}</strong></p>
            <p className="text-muted-foreground">📍 Até <strong>3 km</strong> → <strong className="text-foreground">R$ {deliveryConfig.fee_3km.toFixed(2).replace(".", ",")}</strong></p>
            <p className="text-muted-foreground">📍 Até <strong>4 km</strong> → <strong className="text-foreground">R$ {deliveryConfig.fee_4km.toFixed(2).replace(".", ",")}</strong></p>
            <p className="text-muted-foreground">📍 Acima de <strong>4 km</strong> → <strong className="text-foreground">R$ {deliveryConfig.fee_5km.toFixed(2).replace(".", ",")}</strong></p>
            <p className="text-muted-foreground">🎁 Acima de <strong>R$ {deliveryConfig.free_above.toFixed(2).replace(".", ",")}</strong> → <strong className="text-foreground">Frete grátis</strong></p>
          </div>
        </div>
      </div>

      {/* ── SEÇÃO 6: Horário de Funcionamento ─────────────────────── */}
      <div>
        <SectionHeader>Horário de Funcionamento</SectionHeader>
        <BusinessHoursSection value={businessHours} onChange={setBusinessHours} />
      </div>

      <Button type="submit" className="w-full h-10" disabled={saving}>
        {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Salvando...</> : "Salvar alterações"}
      </Button>
    </form>
  );
}

