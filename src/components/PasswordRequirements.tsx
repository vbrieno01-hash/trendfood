import { Check, Circle } from "lucide-react";

interface Props {
  password: string;
}

const rules = [
  { label: "Mínimo 6 caracteres", test: (p: string) => p.length >= 6 },
  { label: "Pelo menos 1 letra maiúscula (A-Z)", test: (p: string) => /[A-Z]/.test(p) },
  { label: "Pelo menos 1 número (0-9)", test: (p: string) => /[0-9]/.test(p) },
  { label: "Pelo menos 1 caractere especial (!@#$%...)", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

const PasswordRequirements = ({ password }: Props) => {
  return (
    <ul className="space-y-1 mt-2">
      {rules.map((rule) => {
        const passed = password.length > 0 && rule.test(password);
        return (
          <li key={rule.label} className="flex items-center gap-2 text-xs transition-colors duration-200">
            {passed ? (
              <Check className="w-3.5 h-3.5 text-green-500 shrink-0" />
            ) : (
              <Circle className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
            )}
            <span className={passed ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}>
              {rule.label}
            </span>
          </li>
        );
      })}
    </ul>
  );
};

export default PasswordRequirements;
