import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import TermsContent from "./TermsContent";

interface TermsCheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}

const TermsCheckbox = ({ checked, onCheckedChange, disabled }: TermsCheckboxProps) => {
  const [termsOpen, setTermsOpen] = useState(false);

  return (
    <>
      <div className="flex items-start gap-2">
        <Checkbox
          id="terms-accept"
          checked={checked}
          onCheckedChange={(v) => onCheckedChange(v === true)}
          disabled={disabled}
          className="mt-0.5"
        />
        <label htmlFor="terms-accept" className="text-sm text-muted-foreground leading-tight cursor-pointer select-none">
          Li e concordo com os{" "}
          <button
            type="button"
            className="text-primary underline hover:text-primary/80 font-medium"
            onClick={(e) => {
              e.preventDefault();
              setTermsOpen(true);
            }}
          >
            Termos de Uso
          </button>
        </label>
      </div>

      <Dialog open={termsOpen} onOpenChange={setTermsOpen}>
        <DialogContent className="max-w-lg max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Termos de Uso</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh] pr-4">
            <TermsContent />
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TermsCheckbox;
