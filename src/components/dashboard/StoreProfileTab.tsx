import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, Loader2, Copy, Check, X, Search } from "lucide-react";
import { toast } from "sonner";
import BusinessHoursSection, { DEFAULT_BUSINESS_HOURS } from "@/components/dashboard/BusinessHoursSection";
import { BusinessHours, DeliveryConfig } from "@/hooks/useOrganization";
import { DEFAULT_DELIVERY_CONFIG } from "@/hooks/useDeliveryFee";

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
}


const EMOJI_OPTIONS = ["🍔", "🌮", "🍕", "🍜", "🌯", "🥪", "🍗", "🥗", "🍣", "🥩", "🍟", "🧆"];

const BRAZIL_STATES = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"
];

interface AddressFields {
  cep: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
}

function buildStoreAddress(f: AddressFields): string {
  const parts = [f.street, f.number, f.complement, f.neighborhood, f.city, f.state, "Brasil"]
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.join(", ");
}

function parseStoreAddress(address: string): AddressFields {
  // Try to parse a previously-saved structured address (comma-separated)
  // For legacy free-text, leave street filled and rest empty
  const parts = address.split(",").map((p) => p.trim());
  if (parts.length >= 6 && BRAZIL_STATES.includes(parts[parts.length - 2])) {
    // Format: street, number, [complement,] neighborhood, city, state, Brasil
    const withoutBrasil = parts[parts.length - 1].toLowerCase() === "brasil" ? parts.slice(0, -1) : parts;
    const state = withoutBrasil[withoutBrasil.length - 1];
    const city = withoutBrasil[withoutBrasil.length - 2];
    const neighborhood = withoutBrasil[withoutBrasil.length - 3] ?? "";
    const number = withoutBrasil[1] ?? "";
    const street = withoutBrasil[0] ?? "";
    const complement = withoutBrasil.length === 6 ? withoutBrasil[2] : "";
    return { cep: "", street, number, complement, neighborhood, city, state };
  }
  // Fallback: put entire string in street
  return { cep: "", street: address, number: "", complement: "", neighborhood: "", city: "", state: "" };
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground shrink-0">{children}</p>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

export default function StoreProfileTab({ organization }: { organization: Organization }) {
  const { refreshOrganization } = useAuth();
  const [form, setForm] = useState({
    name: organization.name,
    description: organization.description ?? "",
    emoji: organization.emoji,
    slug: organization.slug,
    primary_color: organization.primary_color,
    whatsapp: organization.whatsapp ?? "",
    pix_key: organization.pix_key ?? "",
    store_address: organization.store_address ?? "",
  });
  const [deliveryConfig, setDeliveryConfig] = useState<DeliveryConfig>(
    organization.delivery_config
      ? { ...DEFAULT_DELIVERY_CONFIG, ...(organization.delivery_config as DeliveryConfig) }
      : DEFAULT_DELIVERY_CONFIG
  );
  const [businessHours, setBusinessHours] = useState<BusinessHours>(
    organization.business_hours ?? DEFAULT_BUSINESS_HOURS
  );
  const [addressFields, setAddressFields] = useState<AddressFields>(
    organization.store_address ? parseStoreAddress(organization.store_address) : { cep: "", street: "", number: "", complement: "", neighborhood: "", city: "", state: "" }
  );
  const [cepFetching, setCepFetching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoRemoving, setLogoRemoving] = useState(false);
  const [logoUrl, setLogoUrl] = useState(organization.logo_url);
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const PUBLIC_BASE_URL = "https://trendfood.lovable.app";
  const publicUrl = `${PUBLIC_BASE_URL}/unidade/${form.slug}`;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase
        .from("organizations")
        .update({
          name: form.name,
          description: form.description || null,
          emoji: form.emoji,
          slug: form.slug,
          primary_color: form.primary_color,
          whatsapp: form.whatsapp || null,
          pix_key: form.pix_key || null,
          business_hours: businessHours as unknown as never,
          store_address: buildStoreAddress(addressFields) || null,
          delivery_config: deliveryConfig as unknown as never,
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

      await refreshOrganization();
      toast.success("Perfil da loja atualizado!");
    } catch {
      toast.error("Erro ao salvar perfil.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 2MB.");
      return;
    }
    setLogoUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${organization.id}/logo.${ext}`;
      const { error: uploadError } = await supabase.storage.from("logos").upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("logos").getPublicUrl(path);
      const url = data.publicUrl + `?t=${Date.now()}`;
      setLogoUrl(url);
      await supabase.from("organizations").update({ logo_url: url }).eq("id", organization.id);
      await refreshOrganization();
      toast.success("Logo atualizado!");
    } catch {
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
      setLogoUrl(null);
      await refreshOrganization();
      toast.success("Logo removido.");
    } catch {
      toast.error("Erro ao remover logo.");
    } finally {
      setLogoRemoving(false);
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
      const res = await fetch(`https://viacep.com.br/ws/${cleaned}/json/`);
      const data = await res.json();
      if (data.erro) {
        toast.error("CEP não encontrado.");
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
                Enviar sugestão
              </button>
              <button
                type="button"
                className="text-xs px-3 py-1.5 rounded-full font-semibold border-2"
                style={{ color: form.primary_color, borderColor: form.primary_color }}
              >
                Votar
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
      </div>

      {/* ── SEÇÃO 5: Entrega e Frete ──────────────────────────────── */}
      <div>
        <SectionHeader>Entrega e Frete</SectionHeader>

        {/* CEP + auto-fill */}
        <div className="mb-4">
          <Label className="text-sm font-medium">
            Endereço da loja <span className="text-muted-foreground font-normal">(origem do cálculo de frete)</span>
          </Label>
          <p className="text-xs text-muted-foreground mt-0.5 mb-3">
            Preencha o CEP para preenchimento automático. Usado para calcular o frete até o cliente.
          </p>

          {/* CEP row */}
          <div className="flex gap-2 mb-3">
            <div className="flex-1">
              <Label htmlFor="addr-cep" className="text-xs font-medium mb-1 block">CEP *</Label>
              <Input
                id="addr-cep"
                value={addressFields.cep}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "").slice(0, 8);
                  const formatted = v.length > 5 ? `${v.slice(0, 5)}-${v.slice(5)}` : v;
                  setAddressFields((p) => ({ ...p, cep: formatted }));
                }}
                onBlur={(e) => fetchCep(e.target.value)}
                placeholder="00000-000"
                inputMode="numeric"
                className="font-mono"
              />
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-10 gap-1.5"
                disabled={cepFetching}
                onClick={() => fetchCep(addressFields.cep)}
              >
                {cepFetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                {cepFetching ? "Buscando..." : "Buscar"}
              </Button>
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


        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <Label className="text-xs font-medium mb-1 block">Frete até {deliveryConfig.tier1_km} km (R$)</Label>
            <Input
              type="number"
              min={0}
              step={0.5}
              value={deliveryConfig.fee_tier1}
              onChange={(e) => setDeliveryConfig((p) => ({ ...p, fee_tier1: parseFloat(e.target.value) || 0 }))}
            />
          </div>
          <div>
            <Label className="text-xs font-medium mb-1 block">Limite 1ª faixa (km)</Label>
            <Input
              type="number"
              min={1}
              step={1}
              value={deliveryConfig.tier1_km}
              onChange={(e) => setDeliveryConfig((p) => ({ ...p, tier1_km: parseFloat(e.target.value) || 2 }))}
            />
          </div>
          <div>
            <Label className="text-xs font-medium mb-1 block">Frete de {deliveryConfig.tier1_km} a {deliveryConfig.tier2_km} km (R$)</Label>
            <Input
              type="number"
              min={0}
              step={0.5}
              value={deliveryConfig.fee_tier2}
              onChange={(e) => setDeliveryConfig((p) => ({ ...p, fee_tier2: parseFloat(e.target.value) || 0 }))}
            />
          </div>
          <div>
            <Label className="text-xs font-medium mb-1 block">Limite 2ª faixa (km)</Label>
            <Input
              type="number"
              min={1}
              step={1}
              value={deliveryConfig.tier2_km}
              onChange={(e) => setDeliveryConfig((p) => ({ ...p, tier2_km: parseFloat(e.target.value) || 5 }))}
            />
          </div>
          <div>
            <Label className="text-xs font-medium mb-1 block">Frete acima de {deliveryConfig.tier2_km} km (R$)</Label>
            <Input
              type="number"
              min={0}
              step={0.5}
              value={deliveryConfig.fee_tier3}
              onChange={(e) => setDeliveryConfig((p) => ({ ...p, fee_tier3: parseFloat(e.target.value) || 0 }))}
            />
          </div>
          <div>
            <Label className="text-xs font-medium mb-1 block">Frete grátis acima de (R$)</Label>
            <Input
              type="number"
              min={0}
              step={5}
              value={deliveryConfig.free_above}
              onChange={(e) => setDeliveryConfig((p) => ({ ...p, free_above: parseFloat(e.target.value) || 0 }))}
            />
          </div>
        </div>

        {/* Preview tabela de frete */}
        <div className="bg-secondary/50 rounded-xl p-3 text-xs space-y-1 text-muted-foreground">
          <p className="font-semibold text-foreground text-xs mb-1.5">Tabela atual:</p>
          <p>📍 Até {deliveryConfig.tier1_km} km → <strong>R$ {deliveryConfig.fee_tier1.toFixed(2).replace(".", ",")}</strong></p>
          <p>📍 {deliveryConfig.tier1_km}–{deliveryConfig.tier2_km} km → <strong>R$ {deliveryConfig.fee_tier2.toFixed(2).replace(".", ",")}</strong></p>
          <p>📍 Acima de {deliveryConfig.tier2_km} km → <strong>R$ {deliveryConfig.fee_tier3.toFixed(2).replace(".", ",")}</strong></p>
          <p>🎁 Pedidos acima de R$ {deliveryConfig.free_above.toFixed(2).replace(".", ",")} → <strong>Grátis</strong></p>
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

