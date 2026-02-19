import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { buildStoreAddress, getStateFromCep } from "@/lib/storeAddress";
import { Loader2, ChevronRight, ChevronLeft, Check, Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import BusinessHoursSection, { DEFAULT_BUSINESS_HOURS } from "./BusinessHoursSection";
import { CATEGORIES } from "@/hooks/useMenuItems";
import { BusinessHours } from "@/hooks/useOrganization";

interface Organization {
  id: string;
  name: string;
  emoji: string;
  slug: string;
  business_hours?: BusinessHours | null;
}

interface Props {
  organization: Organization;
  onComplete: () => void;
}

const EMOJIS = ["🍔", "🍕", "🌮", "🍜", "🍣", "🍰", "☕", "🥗", "🌯", "🍗", "🥩", "🍱"];

const STEPS = [
  { title: "Nome e Emoji", subtitle: "Como sua loja vai aparecer para os clientes" },
  { title: "Endereço de Entrega", subtitle: "Onde sua loja está localizada" },
  { title: "Horários de Funcionamento", subtitle: "Quando sua loja está aberta" },
  { title: "Primeiro Item do Cardápio", subtitle: "Adicione o primeiro produto da sua loja" },
];

export default function OnboardingWizard({ organization, onComplete }: Props) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [skipConfirmOpen, setSkipConfirmOpen] = useState(false);

  // Step 1 state
  const [name, setName] = useState(organization.name);
  const [emoji, setEmoji] = useState(organization.emoji);

  // Step 2 state
  const [cep, setCep] = useState("");
  const [loadingCep, setLoadingCep] = useState(false);
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");

  // Step 3 state
  const [businessHours, setBusinessHours] = useState<BusinessHours>(
    (organization.business_hours as BusinessHours) ?? DEFAULT_BUSINESS_HOURS
  );

  // Step 4 state
  const [itemName, setItemName] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [itemCategory, setItemCategory] = useState(CATEGORIES[0].value);
  const [itemDescription, setItemDescription] = useState("");

  const markDone = async () => {
    await supabase
      .from("organizations")
      .update({ onboarding_done: true } as any)
      .eq("id", organization.id);
  };

  const handleSkip = async () => {
    setSaving(true);
    await markDone();
    setSaving(false);
    onComplete();
  };

  const lookupCep = async () => {
    const raw = cep.replace(/\D/g, "");
    if (raw.length !== 8) { toast.error("CEP inválido. Digite 8 dígitos."); return; }
    setLoadingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${raw}/json/`);
      const data = await res.json();
      if (data.erro) { toast.error("CEP não encontrado."); return; }
      setStreet(data.logradouro ?? "");
      setNeighborhood(data.bairro ?? "");
      setCity(data.localidade ?? "");
      setState(data.uf ?? "");
    } catch {
      // ViaCEP failed — infer state from CEP prefix as fallback
      const inferredState = getStateFromCep(raw);
      if (inferredState) setState(inferredState);
      toast.error("Erro ao buscar CEP. Preencha cidade e estado manualmente.");
    } finally {
      setLoadingCep(false);
    }
  };

  const saveStep1 = async () => {
    if (!name.trim()) { toast.error("Digite o nome da loja."); return false; }
    setSaving(true);
    const { error } = await supabase
      .from("organizations")
      .update({ name: name.trim(), emoji })
      .eq("id", organization.id);
    setSaving(false);
    if (error) { toast.error("Erro ao salvar."); return false; }
    return true;
  };

  const saveStep2 = async () => {
    // Address is optional — save whatever is filled in structured format
    const hasAnyField = [street, number, neighborhood, city, state].some(Boolean);
    const address = hasAnyField
      ? buildStoreAddress({ cep, street, number, complement, neighborhood, city, state })
      : null;
    setSaving(true);
    const { error } = await supabase
      .from("organizations")
      .update({ store_address: address } as any)
      .eq("id", organization.id);
    setSaving(false);
    if (error) { toast.error("Erro ao salvar endereço."); return false; }
    return true;
  };

  const saveStep3 = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("organizations")
      .update({ business_hours: businessHours as any })
      .eq("id", organization.id);
    setSaving(false);
    if (error) { toast.error("Erro ao salvar horários."); return false; }
    return true;
  };

  const saveStep4 = async () => {
    if (!itemName.trim()) { toast.error("Digite o nome do item."); return false; }
    const price = parseFloat(itemPrice.replace(",", "."));
    if (isNaN(price) || price <= 0) { toast.error("Digite um preço válido."); return false; }
    setSaving(true);
    const { error: itemError } = await supabase.from("menu_items").insert({
      organization_id: organization.id,
      name: itemName.trim(),
      price,
      category: itemCategory,
      description: itemDescription.trim() || null,
      available: true,
    });
    if (itemError) { setSaving(false); toast.error("Erro ao adicionar item."); return false; }
    await markDone();
    setSaving(false);
    return true;
  };

  const handleNext = async () => {
    let ok = false;
    if (step === 1) ok = await saveStep1();
    if (step === 2) ok = await saveStep2();
    if (step === 3) ok = await saveStep3();
    if (ok) setStep((s) => s + 1);
  };

  const handleFinish = async () => {
    const ok = await saveStep4();
    if (ok) {
      toast.success("Configuração concluída! Bem-vindo ao TrendFood 🎉");
      onComplete();
    }
  };

  const progressPercent = ((step - 1) / (STEPS.length - 1)) * 100;

  return (
    <>
      <Dialog open modal>
        <DialogContent
          className="sm:max-w-lg w-full max-h-[90vh] overflow-y-auto"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          {/* Progress */}
          <div className="mb-2">
            <div className="flex items-center gap-2 mb-3">
              {STEPS.map((_, i) => (
                <div key={i} className="flex items-center gap-2 flex-1">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
                      i + 1 < step
                        ? "bg-primary text-primary-foreground"
                        : i + 1 === step
                        ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {i + 1 < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-500"
                        style={{ width: step > i + 1 ? "100%" : "0%" }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
            <DialogHeader>
              <DialogTitle>{STEPS[step - 1].title}</DialogTitle>
              <DialogDescription>{STEPS[step - 1].subtitle}</DialogDescription>
            </DialogHeader>
          </div>

          {/* Step 1: Nome & Emoji */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="store-name">Nome da loja *</Label>
                <Input
                  id="store-name"
                  placeholder="Ex: Burger do João"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Escolha um emoji</Label>
                <div className="grid grid-cols-6 gap-2">
                  {EMOJIS.map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => setEmoji(e)}
                      className={`h-11 rounded-xl text-2xl flex items-center justify-center transition-all ${
                        emoji === e
                          ? "bg-primary/15 ring-2 ring-primary"
                          : "bg-muted hover:bg-muted/80"
                      }`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Endereço */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cep">CEP</Label>
                <div className="flex gap-2">
                  <Input
                    id="cep"
                    placeholder="00000-000"
                    value={cep}
                    onChange={(e) => setCep(e.target.value)}
                    maxLength={9}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={lookupCep}
                    disabled={loadingCep}
                    className="shrink-0"
                  >
                    {loadingCep ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-2">
                  <Label>Rua</Label>
                  <Input placeholder="Rua das Flores" value={street} onChange={(e) => setStreet(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Número</Label>
                  <Input placeholder="123" value={number} onChange={(e) => setNumber(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Complemento</Label>
                  <Input placeholder="Apto 4" value={complement} onChange={(e) => setComplement(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Bairro</Label>
                  <Input placeholder="Centro" value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-2">
                  <Label>Cidade</Label>
                  <Input placeholder="São Paulo" value={city} onChange={(e) => setCity(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Input placeholder="SP" maxLength={2} value={state} onChange={(e) => setState(e.target.value.toUpperCase())} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">O endereço é opcional — você pode preencher depois em Perfil da Loja.</p>
            </div>
          )}

          {/* Step 3: Horários */}
          {step === 3 && (
            <BusinessHoursSection value={businessHours} onChange={setBusinessHours} />
          )}

          {/* Step 4: Primeiro Item */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome do item *</Label>
                <Input placeholder="Ex: X-Burguer Clássico" value={itemName} onChange={(e) => setItemName(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Preço (R$) *</Label>
                  <Input
                    placeholder="25,90"
                    value={itemPrice}
                    onChange={(e) => setItemPrice(e.target.value)}
                    inputMode="decimal"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select value={itemCategory} onValueChange={setItemCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.emoji} {c.value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Descrição (opcional)</Label>
                <Textarea
                  placeholder="Descreva o item brevemente..."
                  rows={3}
                  value={itemDescription}
                  onChange={(e) => setItemDescription(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Footer buttons */}
          <div className="flex items-center justify-between pt-2 border-t border-border mt-4">
            <div>
              {step > 1 && (
                <Button variant="ghost" size="sm" onClick={() => setStep((s) => s - 1)} disabled={saving}>
                  <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              {step < 4 ? (
                <Button onClick={handleNext} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Próximo <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button onClick={handleFinish} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                  Concluir
                </Button>
              )}
            </div>
          </div>

          {/* Skip link */}
          <div className="text-center pt-1">
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors underline-offset-2 hover:underline"
              onClick={() => setSkipConfirmOpen(true)}
              disabled={saving}
            >
              Pular configuração
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Skip confirmation */}
      <AlertDialog open={skipConfirmOpen} onOpenChange={setSkipConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pular a configuração?</AlertDialogTitle>
            <AlertDialogDescription>
              Você poderá configurar tudo isso depois em <strong>Perfil da Loja</strong> e <strong>Meu Cardápio</strong>. Deseja pular mesmo assim?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar configurando</AlertDialogCancel>
            <AlertDialogAction onClick={handleSkip} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Sim, pular
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
