import { Card, CardContent } from "@/components/ui/card";

interface IFoodTabProps {
  orgId: string;
}

const IFoodTab = (_props: IFoodTabProps) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Integração iFood</h2>
        <p className="text-sm text-muted-foreground">Receba pedidos do iFood direto no seu dashboard.</p>
      </div>

      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="text-center space-y-2 py-8">
            <div className="text-5xl">🛵</div>
            <h3 className="text-lg font-semibold">Em Breve</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Estamos finalizando a integração com o iFood. Em breve você poderá receber pedidos e sincronizar seu cardápio automaticamente.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default IFoodTab;
