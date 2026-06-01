import { useMemo } from "react";
import { Loader2, Wallet, Percent, Users, Target, History, Sparkles } from "lucide-react";
import { Section } from "./affiliates/Section";
import AffiliateKpis from "./affiliates/AffiliateKpis";
import NextPayoutSection from "./affiliates/NextPayoutSection";
import TiersGrid from "./affiliates/TiersGrid";
import AffiliateCards from "./affiliates/AffiliateCards";
import GoalsTable from "./affiliates/GoalsTable";
import BatchesHistory from "./affiliates/BatchesHistory";
import {
  useAffiliates, useTiers, useGoals, useCommissions, useBatches,
  useOrgsMap, useStoresPerAffiliate,
} from "./affiliates/useAffiliateData";

export default function AffiliatesTab() {
  const { data: affiliates = [], isLoading: lA } = useAffiliates();
  const { data: tiers = [], isLoading: lT } = useTiers();
  const { data: goals = [], isLoading: lG } = useGoals();
  const { data: commissions = [], isLoading: lC } = useCommissions();
  const { data: batches = [] } = useBatches();
  const { data: storesByAff = {} } = useStoresPerAffiliate();

  const orgIds = useMemo(
    () => Array.from(new Set(goals.map((g) => g.client_org_id))),
    [goals]
  );
  const { data: orgsMap = {} } = useOrgsMap(orgIds);

  const loading = lA || lT || lG || lC;

  return (
    <div className="space-y-4 animate-admin-fade-in">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Afiliados</h2>
          <p className="text-sm text-muted-foreground">Metas por cliente · escolha À Vista ou 3x via Telegram · pagamento dia 5</p>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin inline" />
        </div>
      ) : (
        <>
          <AffiliateKpis affiliates={affiliates} goals={goals} commissions={commissions} />

          <Section
            title="Próximo pagamento — Dia 5"
            icon={<Wallet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
            accent="emerald"
            defaultOpen
          >
            <NextPayoutSection affiliates={affiliates} commissions={commissions} />
          </Section>

          <Section
            title="Tabela V8 — % de comissões"
            icon={<Percent className="w-5 h-5 text-violet-600 dark:text-violet-400" />}
            accent="violet"
            defaultOpen={false}
          >
            <TiersGrid tiers={tiers} />
          </Section>

          <Section
            title={`Afiliados (${affiliates.length})`}
            icon={<Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
            accent="blue"
            defaultOpen
          >
            <AffiliateCards
              affiliates={affiliates}
              goals={goals}
              commissions={commissions}
              storesByAff={storesByAff}
              orgsMap={orgsMap}
            />
          </Section>

          <Section
            title={`Metas (${goals.length})`}
            icon={<Target className="w-5 h-5 text-amber-600 dark:text-amber-400" />}
            accent="amber"
            defaultOpen={false}
          >
            <GoalsTable
              goals={goals}
              affiliates={affiliates}
              commissions={commissions}
              orgsMap={orgsMap}
            />
          </Section>

          <Section
            title={`Histórico de pagamentos (${batches.length})`}
            icon={<History className="w-5 h-5 text-muted-foreground" />}
            defaultOpen={false}
          >
            <BatchesHistory batches={batches} commissions={commissions} affiliates={affiliates} />
          </Section>
        </>
      )}
    </div>
  );
}