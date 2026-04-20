import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const REASONS = [
  { value: "out_of_stock", label: "Falta de produto / ingrediente" },
  { value: "customer_gave_up", label: "Cliente desistiu / não respondeu" },
  { value: "out_of_area", label: "Endereço fora da área de entrega" },
  { value: "system_error", label: "Erro do sistema / pedido duplicado" },
  { value: "other", label: "Outro motivo" },
];

interface Props {
  /** O elemento que abre o dialog (geralmente o botão de lixeira/cancelar) */
  trigger: React.ReactNode;
  onConfirm: (reason: string) => void;
}

export default function CancelOrderDialog({ trigger, onConfirm }: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>("");
  const [otherText, setOtherText] = useState("");

  const handleConfirm = () => {
    const finalReason = reason === "other" && otherText.trim()
      ? `other: ${otherText.trim().slice(0, 200)}`
      : reason;
    onConfirm(finalReason);
    setOpen(false);
    setReason("");
    setOtherText("");
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancelar pedido?</AlertDialogTitle>
          <AlertDialogDescription>
            Selecione um motivo para nos ajudar a entender e melhorar o atendimento. Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-2">
          <Label className="text-sm font-medium mb-3 block">Motivo *</Label>
          <RadioGroup value={reason} onValueChange={setReason} className="space-y-2">
            {REASONS.map((r) => (
              <label
                key={r.value}
                htmlFor={`reason-${r.value}`}
                className="flex items-start gap-3 cursor-pointer p-2 rounded-md hover:bg-accent transition-colors"
              >
                <RadioGroupItem value={r.value} id={`reason-${r.value}`} className="mt-0.5" />
                <span className="text-sm text-foreground leading-snug">{r.label}</span>
              </label>
            ))}
          </RadioGroup>

          {reason === "other" && (
            <div className="mt-3">
              <Label className="text-xs text-muted-foreground mb-1 block">Descreva (opcional)</Label>
              <Textarea
                value={otherText}
                onChange={(e) => setOtherText(e.target.value)}
                placeholder="Ex: cliente pediu pra cancelar via WhatsApp"
                rows={2}
                maxLength={200}
                className="text-sm"
              />
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Voltar</AlertDialogCancel>
          <AlertDialogAction
            disabled={!reason}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
            onClick={handleConfirm}
          >
            Sim, cancelar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}