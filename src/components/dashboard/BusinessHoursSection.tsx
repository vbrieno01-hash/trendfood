import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { BusinessHours } from "@/hooks/useOrganization";
import { Coffee } from "lucide-react";

const DAYS = [
  { key: "seg", label: "Segunda" },
  { key: "ter", label: "Terça" },
  { key: "qua", label: "Quarta" },
  { key: "qui", label: "Quinta" },
  { key: "sex", label: "Sexta" },
  { key: "sab", label: "Sábado" },
  { key: "dom", label: "Domingo" },
];

export const DEFAULT_BUSINESS_HOURS: BusinessHours = {
  enabled: false,
  schedule: {
    seg: { open: true, from: "08:00", to: "22:00", break_from: "", break_to: "" },
    ter: { open: true, from: "08:00", to: "22:00", break_from: "", break_to: "" },
    qua: { open: true, from: "08:00", to: "22:00", break_from: "", break_to: "" },
    qui: { open: true, from: "08:00", to: "22:00", break_from: "", break_to: "" },
    sex: { open: true, from: "08:00", to: "23:00", break_from: "", break_to: "" },
    sab: { open: true, from: "10:00", to: "23:00", break_from: "", break_to: "" },
    dom: { open: false, from: "10:00", to: "20:00", break_from: "", break_to: "" },
  },
};

interface Props {
  value: BusinessHours;
  onChange: (bh: BusinessHours) => void;
}

export default function BusinessHoursSection({ value, onChange }: Props) {
  const toggleEnabled = (checked: boolean) => {
    onChange({ ...value, enabled: checked });
  };

  const toggleDay = (key: string, checked: boolean) => {
    onChange({
      ...value,
      schedule: {
        ...value.schedule,
        [key]: { ...value.schedule[key], open: checked },
      },
    });
  };

  const setTime = (key: string, field: "from" | "to" | "break_from" | "break_to", time: string) => {
    onChange({
      ...value,
      schedule: {
        ...value.schedule,
        [key]: { ...value.schedule[key], [field]: time },
      },
    });
  };

  const hasBreak = (key: string) => {
    const d = value.schedule[key];
    return d && d.break_from && d.break_to;
  };

  const toggleBreak = (key: string) => {
    const d = value.schedule[key];
    if (hasBreak(key)) {
      // Remove break
      onChange({
        ...value,
        schedule: {
          ...value.schedule,
          [key]: { ...d, break_from: "", break_to: "" },
        },
      });
    } else {
      // Add default break 12:00-13:00
      onChange({
        ...value,
        schedule: {
          ...value.schedule,
          [key]: { ...d, break_from: "12:00", break_to: "13:00" },
        },
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Toggle principal */}
      <div className="flex items-center justify-between py-1">
        <div>
          <p className="text-sm font-medium text-foreground">Controlar horário de funcionamento</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {value.enabled
              ? "Clientes verão se a loja está aberta ou fechada"
              : "Sem restrição — loja sempre visível como aberta"}
          </p>
        </div>
        <Switch checked={value.enabled} onCheckedChange={toggleEnabled} />
      </div>

      {/* Tabela de dias — só aparece quando ativo */}
      {value.enabled && (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-secondary/60 border-b border-border">
                <th className="text-left text-xs font-semibold text-muted-foreground px-3 py-2 w-8"></th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-2 py-2">Dia</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-2 py-2">Abre</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-2 py-2">Fecha</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-2 py-2 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {DAYS.map((day) => {
                const d = value.schedule[day.key] ?? { open: false, from: "08:00", to: "22:00" };
                const breakActive = hasBreak(day.key);
                return (
                  <>
                    <tr
                      key={day.key}
                      className={`border-b border-border last:border-0 transition-colors ${
                        d.open ? "bg-card" : "bg-secondary/30"
                      }`}
                    >
                      <td className="px-3 py-2.5">
                        <Checkbox
                          checked={d.open}
                          onCheckedChange={(checked) => toggleDay(day.key, !!checked)}
                        />
                      </td>
                      <td className="px-2 py-2.5">
                        <Label
                          className={`text-sm font-medium cursor-pointer ${
                            d.open ? "text-foreground" : "text-muted-foreground"
                          }`}
                          onClick={() => toggleDay(day.key, !d.open)}
                        >
                          {day.label}
                        </Label>
                      </td>
                      <td className="px-2 py-2.5">
                        <input
                          type="time"
                          value={d.from}
                          disabled={!d.open}
                          onChange={(e) => setTime(day.key, "from", e.target.value)}
                          className="h-8 rounded-md border border-input bg-background px-2 text-xs disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </td>
                      <td className="px-2 py-2.5">
                        <input
                          type="time"
                          value={d.to}
                          disabled={!d.open}
                          onChange={(e) => setTime(day.key, "to", e.target.value)}
                          className="h-8 rounded-md border border-input bg-background px-2 text-xs disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </td>
                      <td className="px-2 py-2.5">
                        {d.open && (
                          <button
                            type="button"
                            onClick={() => toggleBreak(day.key)}
                            title={breakActive ? "Remover intervalo" : "Adicionar intervalo"}
                            className={`p-1.5 rounded-md transition-colors ${
                              breakActive
                                ? "bg-primary/10 text-primary"
                                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                            }`}
                          >
                            <Coffee className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                    {/* Linha de intervalo */}
                    {d.open && breakActive && (
                      <tr key={`${day.key}-break`} className="border-b border-border last:border-0 bg-amber-50/50 dark:bg-amber-950/20">
                        <td className="px-3 py-2"></td>
                        <td className="px-2 py-2">
                          <span className="text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1">
                            <Coffee className="h-3 w-3" />
                            Intervalo
                          </span>
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="time"
                            value={d.break_from || "12:00"}
                            onChange={(e) => setTime(day.key, "break_from", e.target.value)}
                            className="h-7 rounded-md border border-amber-300 dark:border-amber-700 bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="time"
                            value={d.break_to || "13:00"}
                            onChange={(e) => setTime(day.key, "break_to", e.target.value)}
                            className="h-7 rounded-md border border-amber-300 dark:border-amber-700 bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400"
                          />
                        </td>
                        <td></td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
