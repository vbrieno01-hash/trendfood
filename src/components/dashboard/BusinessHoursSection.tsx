import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { BusinessHours } from "@/hooks/useOrganization";

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
    seg: { open: true, from: "08:00", to: "22:00" },
    ter: { open: true, from: "08:00", to: "22:00" },
    qua: { open: true, from: "08:00", to: "22:00" },
    qui: { open: true, from: "08:00", to: "22:00" },
    sex: { open: true, from: "08:00", to: "23:00" },
    sab: { open: true, from: "10:00", to: "23:00" },
    dom: { open: false, from: "10:00", to: "20:00" },
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

  const setTime = (key: string, field: "from" | "to", time: string) => {
    onChange({
      ...value,
      schedule: {
        ...value.schedule,
        [key]: { ...value.schedule[key], [field]: time },
      },
    });
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
              </tr>
            </thead>
            <tbody>
              {DAYS.map((day, i) => {
                const d = value.schedule[day.key] ?? { open: false, from: "08:00", to: "22:00" };
                return (
                  <tr
                    key={day.key}
                    className={`border-b border-border last:border-0 transition-colors ${
                      d.open ? "bg-card" : "bg-secondary/30"
                    } ${i % 2 === 0 ? "" : ""}`}
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
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
