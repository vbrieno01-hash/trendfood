import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  QrCode,
  CreditCard,
  Banknote,
  ArrowLeft,
  ShoppingBag,
  User,
  Phone,
  MapPin,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CheckoutPageProps {
  items: { id: string; name: string; price: number; qty: number }[];
  onConfirm: (data: { name: string; phone: string; address: string; payment: string }) => void;
  onBack: () => void;
}

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

const paymentOptions = [
  { value: "pix", label: "PIX", icon: QrCode },
  { value: "cartao", label: "Cartão", icon: CreditCard },
  { value: "entrega", label: "Pagar na Entrega", icon: Banknote },
];

export default function CheckoutPage({ items, onConfirm, onBack }: CheckoutPageProps) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [payment, setPayment] = useState("pix");

  const total = items.reduce((sum, i) => sum + i.price * i.qty, 0);

  const handleSubmit = () => {
    if (!name.trim()) {
      toast({ title: "Preencha seu nome", variant: "destructive" });
      return;
    }
    if (phone.replace(/\D/g, "").length < 10) {
      toast({ title: "Informe um WhatsApp válido", variant: "destructive" });
      return;
    }
    if (!address.trim()) {
      toast({ title: "Informe o endereço de entrega", variant: "destructive" });
      return;
    }
    onConfirm({ name: name.trim(), phone, address: address.trim(), payment });
  };

  /* ── Order Summary Card ── */
  const OrderSummary = (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ShoppingBag className="w-4 h-4 text-primary" />
          Resumo do pedido
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <ScrollArea className={items.length > 5 ? "max-h-48" : ""}>
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item.id} className="flex justify-between text-sm">
                <span className="text-foreground">
                  {item.qty}× {item.name}
                </span>
                <span className="font-medium text-foreground">{fmt(item.price * item.qty)}</span>
              </li>
            ))}
          </ul>
        </ScrollArea>
        <Separator />
        <div className="flex justify-between font-bold text-foreground">
          <span>Total</span>
          <span className="text-primary">{fmt(total)}</span>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-bold text-foreground">Finalizar Pedido</h1>
      </header>

      <div className="max-w-4xl mx-auto p-4 md:p-6 grid gap-6 md:grid-cols-[1fr_320px]">
        {/* Mobile: summary on top */}
        <div className="md:hidden">{OrderSummary}</div>

        {/* Left column: form */}
        <div className="space-y-6">
          {/* Customer data */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Seus dados</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ck-name" className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-muted-foreground" /> Nome
                </Label>
                <Input
                  id="ck-name"
                  placeholder="Seu nome completo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ck-phone" className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-muted-foreground" /> WhatsApp
                </Label>
                <Input
                  id="ck-phone"
                  placeholder="(00) 00000-0000"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ck-address" className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground" /> Endereço
                </Label>
                <Input
                  id="ck-address"
                  placeholder="Rua, número, bairro"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Payment method */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Pagamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <RadioGroup value={payment} onValueChange={setPayment} className="grid gap-3">
                {paymentOptions.map((opt) => {
                  const Icon = opt.icon;
                  const selected = payment === opt.value;
                  return (
                    <label
                      key={opt.value}
                      className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition-colors ${
                        selected
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/40"
                      }`}
                    >
                      <RadioGroupItem value={opt.value} />
                      <Icon className={`w-5 h-5 ${selected ? "text-primary" : "text-muted-foreground"}`} />
                      <span className={`text-sm font-medium ${selected ? "text-primary" : "text-foreground"}`}>
                        {opt.label}
                      </span>
                    </label>
                  );
                })}
              </RadioGroup>

              {/* PIX placeholder */}
              {payment === "pix" && (
                <div className="flex flex-col items-center gap-3 py-4">
                  <div className="w-64 h-64 rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 flex flex-col items-center justify-center gap-2">
                    <QrCode className="w-16 h-16 text-primary/40" />
                    <p className="text-xs text-muted-foreground text-center px-4">
                      QR Code será gerado ao confirmar o pedido
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submit */}
          <Button size="lg" className="w-full text-base font-bold gap-2" onClick={handleSubmit}>
            Finalizar Pedido — {fmt(total)}
          </Button>
        </div>

        {/* Right column: sticky summary (desktop) */}
        <div className="hidden md:block">
          <div className="sticky top-20">{OrderSummary}</div>
        </div>
      </div>
    </div>
  );
}
