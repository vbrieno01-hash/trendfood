import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Copy, Check, Gift, Users } from "lucide-react";
import { toast } from "sonner";

interface ReferralSectionProps {
  orgId: string;
}

export default function ReferralSection({ orgId }: ReferralSectionProps) {
  const [count, setCount] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const referralLink = `${window.location.origin}/cadastro?ref=${orgId}`;

  useEffect(() => {
    (supabase
      .from("organizations")
      .select("id", { count: "exact", head: true }) as any)
      .eq("referred_by_id", orgId)
      .then(({ count: c }: { count: number | null }) => setCount(c ?? 0));
  }, [orgId]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast.success("Link copiado!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar. Copie manualmente.");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Gift className="w-5 h-5 text-primary" />
          Ganhe Desconto
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Indique amigos para o TrendFood e ganhe benefícios!
        </p>
      </div>

      {/* Referral card */}
      <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Gift className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-foreground text-lg">Compartilhe seu link</h3>
            <p className="text-sm text-muted-foreground">
              Envie para outros donos de lanchonetes. Quando eles se cadastrarem pelo seu link, você acumula indicações!
            </p>
          </div>
        </div>

        {/* Link box */}
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-muted/50 border border-border rounded-lg px-3 py-2.5 text-sm font-mono text-muted-foreground truncate">
            {referralLink}
          </div>
          <Button onClick={handleCopy} size="sm" className="shrink-0 gap-1.5">
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copiado" : "Copiar"}
          </Button>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 bg-muted/30 rounded-xl px-4 py-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{count ?? "—"}</p>
            <p className="text-xs text-muted-foreground">amigos já indicados</p>
          </div>
        </div>
      </div>
    </div>
  );
}
