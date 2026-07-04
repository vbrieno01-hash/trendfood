import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, ListChecks, CheckCircle2, Clock, Play, CalendarOff } from "lucide-react";

type TaskStatus = "pendente" | "em_andamento" | "pronto" | "outro_dia";

interface ImprovementTask {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: number;
  created_at: string;
  updated_at: string;
}

const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pendente: { label: "Pendente", color: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700", icon: <Clock className="w-3.5 h-3.5" /> },
  em_andamento: { label: "Em andamento", color: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-700", icon: <Play className="w-3.5 h-3.5" /> },
  pronto: { label: "Pronto ✅", color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  outro_dia: { label: "Outro dia", color: "bg-muted text-muted-foreground border-border", icon: <CalendarOff className="w-3.5 h-3.5" /> },
};

export default function ImprovementsTab() {
  const [tasks, setTasks] = useState<ImprovementTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const fetchTasks = async () => {
    const { data, error } = await supabase
      .from("improvement_tasks")
      .select("*")
      .order("priority", { ascending: false })
      .order("created_at", { ascending: true });
    if (error) {
      console.error("Erro ao buscar melhorias:", error);
      toast.error("Erro ao carregar melhorias");
    }
    setTasks((data as ImprovementTask[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchTasks(); }, []);

  const updateStatus = async (id: string, status: TaskStatus) => {
    await supabase.from("improvement_tasks").update({ status }).eq("id", id);
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t));
  };

  const addTask = async () => {
    if (!newTitle.trim()) return;
    const { error } = await supabase.from("improvement_tasks").insert({
      title: newTitle.trim(),
      description: newDesc.trim() || null,
    });
    if (error) { toast.error("Erro ao adicionar"); return; }
    toast.success("Melhoria adicionada!");
    setNewTitle(""); setNewDesc(""); setShowAdd(false);
    fetchTasks();
  };

  const deleteTask = async (id: string) => {
    await supabase.from("improvement_tasks").delete().eq("id", id);
    setTasks(prev => prev.filter(t => t.id !== id));
    toast.success("Removida");
  };

  const doneCount = tasks.filter(t => t.status === "pronto").length;
  const totalCount = tasks.length;

  const statusOrder: TaskStatus[] = ["em_andamento", "pendente", "outro_dia", "pronto"];
  const sorted = [...tasks].sort((a, b) => statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <ListChecks className="w-6 h-6 text-primary" /> Melhorias
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            {doneCount} de {totalCount} concluídas
          </p>
        </div>
        <Button onClick={() => setShowAdd(true)} size="sm">
          <Plus className="w-4 h-4 mr-1" /> Adicionar
        </Button>
      </div>

      {/* Progress bar */}
      {totalCount > 0 && (
        <div className="w-full bg-muted rounded-full h-2.5">
          <div
            className="bg-emerald-500 h-2.5 rounded-full transition-all"
            style={{ width: `${(doneCount / totalCount) * 100}%` }}
          />
        </div>
      )}

      {/* Task list */}
      {loading ? (
        <p className="text-muted-foreground text-center py-8">Carregando...</p>
      ) : (
        <div className="grid gap-3">
          {sorted.map(task => {
            const cfg = STATUS_CONFIG[task.status];
            return (
              <Card key={task.id} className={task.status === "pronto" ? "opacity-60" : ""}>
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-medium ${task.status === "pronto" ? "line-through" : ""}`}>
                        {task.title}
                      </span>
                      <Badge variant="outline" className={`text-xs ${cfg.color} flex items-center gap-1`}>
                        {cfg.icon} {cfg.label}
                      </Badge>
                    </div>
                    {task.description && (
                      <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Select value={task.status} onValueChange={(v) => updateStatus(task.id, v as TaskStatus)}>
                      <SelectTrigger className="w-[140px] max-[380px]:w-full h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pendente">⏳ Pendente</SelectItem>
                        <SelectItem value="em_andamento">🔵 Em andamento</SelectItem>
                        <SelectItem value="pronto">✅ Pronto</SelectItem>
                        <SelectItem value="outro_dia">⏸️ Outro dia</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteTask(task.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Melhoria</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Título da melhoria" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
            <Textarea placeholder="Descrição (opcional)" value={newDesc} onChange={e => setNewDesc(e.target.value)} rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancelar</Button>
            <Button onClick={addTask} disabled={!newTitle.trim()}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
