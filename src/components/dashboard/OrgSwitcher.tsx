import { useState } from "react";
import { Check, ChevronsUpDown, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Organization {
  id: string;
  name: string;
  slug: string;
  emoji: string;
  logo_url: string | null;
}

interface OrgSwitcherProps {
  organizations: Organization[];
  activeOrg: Organization;
  onSwitch: (orgId: string) => void;
  onCreateNew: () => void;
  canCreateNew: boolean;
  onDelete?: (orgId: string) => void;
}

export default function OrgSwitcher({ organizations, activeOrg, onSwitch, onCreateNew, canCreateNew, onDelete }: OrgSwitcherProps) {
  const [open, setOpen] = useState(false);
  const hasMultiple = organizations.length > 1;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="w-full flex items-center gap-3 bg-white/5 rounded-xl px-3 py-2.5 hover:bg-white/10 transition-colors text-left">
          {activeOrg.logo_url ? (
            <img src={activeOrg.logo_url} alt={activeOrg.name} className="w-9 h-9 rounded-lg object-cover ring-1 ring-white/20" />
          ) : (
            <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center text-lg border border-primary/30">
              {activeOrg.emoji}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-bold text-white text-sm truncate">{activeOrg.name}</p>
            <p className="text-white/40 text-xs truncate">/{activeOrg.slug}</p>
          </div>
          {(hasMultiple || canCreateNew) && (
            <ChevronsUpDown className="w-4 h-4 text-white/40 shrink-0" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-60 p-1.5" side="right" align="start">
        <div className="space-y-0.5">
          {organizations.map((org) => (
            <button
              key={org.id}
              onClick={() => {
                onSwitch(org.id);
                setOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-accent text-left transition-colors"
            >
              {org.logo_url ? (
                <img src={org.logo_url} alt={org.name} className="w-7 h-7 rounded-md object-cover" />
              ) : (
                <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center text-sm">
                  {org.emoji}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{org.name}</p>
                <p className="text-xs text-muted-foreground truncate">/{org.slug}</p>
              </div>
              {org.id === activeOrg.id && (
                <Check className="w-4 h-4 text-primary shrink-0" />
              )}
              {org.id !== activeOrg.id && organizations.length > 1 && onDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(org.id);
                    setOpen(false);
                  }}
                  className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                  title="Excluir unidade"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </button>
          ))}
        </div>
        {canCreateNew && (
          <>
            <div className="border-t my-1.5" />
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 text-sm"
              onClick={() => {
                onCreateNew();
                setOpen(false);
              }}
            >
              <Plus className="w-4 h-4" />
              Nova unidade
              <Badge variant="outline" className="ml-auto text-[10px] px-1.5 py-0 bg-purple-500/15 text-purple-600 border-purple-500/20">
                Enterprise
              </Badge>
            </Button>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
