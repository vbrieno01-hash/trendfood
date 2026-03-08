import { useState } from "react";
import { usePricingData, useUpdateMenuPrice } from "@/hooks/usePricingData";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { Calculator, AlertTriangle, Check, CheckCheck } from "lucide-react";

interface PricingTabProps {
  orgId: string;
}

const fmt = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

export default function PricingTab({ orgId }: PricingTabProps) {
  const { data: items = [], isLoading } = usePricingData(orgId);
  const updatePrice = useUpdateMenuPrice(orgId);
  const [markup, setMarkup] = useState(60);

  const suggestedPrice = (cost: number) => cost > 0 ? cost / (1 - markup / 100) : 0;

  const withIngredients = items.filter((i) => i.hasIngredients);
  const withoutIngredients = items.filter((i) => !i.hasIngredients);

  const avgCost = withIngredients.length > 0
    ? withIngredients.reduce((s, i) => s + i.totalCost, 0) / withIngredients.length
    : 0;
  const avgMargin = withIngredients.length > 0
    ? withIngredients.reduce((s, i) => s + (i.margin ?? 0), 0) / withIngredients.length
    : 0;

  const handleApply = (id: string, price: number) => {
    updatePrice.mutate({ id, price: Math.round(price * 100) / 100 });
  };

  const handleApplyAll = () => {
    withIngredients.forEach((item) => {
      const sp = suggestedPrice(item.totalCost);
      if (sp > 0 && Math.abs(sp - item.currentPrice) > 0.01) {
        updatePrice.mutate({ id: item.id, price: Math.round(sp * 100) / 100 });
      }
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Calculator className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold">Precificação</h2>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="pt-5 space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Margem desejada: <span className="text-primary font-bold">{markup}%</span>
            </label>
            <Slider
              value={[markup]}
              onValueChange={([v]) => setMarkup(v)}
              min={20}
              max={90}
              step={1}
              className="w-full max-w-md"
            />
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <span className="text-muted-foreground">
              Custo médio: <strong className="text-foreground">{fmt(avgCost)}</strong>
            </span>
            <span className="text-muted-foreground">
              Margem média: <strong className="text-foreground">{avgMargin.toFixed(1)}%</strong>
            </span>
            {withoutIngredients.length > 0 && (
              <span className="text-amber-600 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                {withoutIngredients.length} {withoutIngredients.length === 1 ? "item" : "itens"} sem ficha técnica
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Custo</TableHead>
                <TableHead className="text-right">Preço Atual</TableHead>
                <TableHead className="text-right">Margem</TableHead>
                <TableHead className="text-right">Sugerido</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const sp = suggestedPrice(item.totalCost);
                const marginColor = item.margin === null
                  ? ""
                  : item.margin > 50
                    ? "text-green-600"
                    : item.margin >= 30
                      ? "text-amber-600"
                      : "text-destructive";
                const marginBadge = item.margin === null
                  ? null
                  : item.margin > 50
                    ? "default"
                    : item.margin >= 30
                      ? "secondary"
                      : "destructive";
                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div>
                        <span className="font-medium">{item.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">{item.category}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {item.hasIngredients ? fmt(item.totalCost) : <span className="text-muted-foreground text-xs">—</span>}
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium">
                      {fmt(item.currentPrice)}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.margin !== null ? (
                        <Badge variant={marginBadge as any} className="font-mono">
                          {item.margin.toFixed(0)}%
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {item.hasIngredients && sp > 0 ? (
                        <span className={marginColor}>{fmt(sp)}</span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.hasIngredients && sp > 0 && Math.abs(sp - item.currentPrice) > 0.01 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleApply(item.id, sp)}
                          disabled={updatePrice.isPending}
                          title="Aplicar preço sugerido"
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Apply all */}
      {withIngredients.length > 0 && (
        <Button onClick={handleApplyAll} disabled={updatePrice.isPending} className="gap-2">
          <CheckCheck className="w-4 h-4" />
          Aplicar Todos os Preços Sugeridos
        </Button>
      )}
    </div>
  );
}
