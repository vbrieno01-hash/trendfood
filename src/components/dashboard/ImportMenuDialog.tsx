import { useState, useRef } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import Papa from "papaparse";
import * as XLSX from "xlsx";

interface Organization {
  id: string;
  name: string;
  slug: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organization: Organization;
}

type Step = "upload" | "mapping" | "result";

const SYSTEM_FIELDS = [
  { value: "name", label: "Nome do Produto", required: true },
  { value: "price", label: "Preço", required: true },
  { value: "description", label: "Descrição", required: false },
  { value: "category", label: "Categoria", required: false },
] as const;

type FieldKey = (typeof SYSTEM_FIELDS)[number]["value"];

function parsePrice(raw: unknown): number | null {
  const cleaned = String(raw ?? "")
    .replace(/[R$\s.]/g, "")
    .replace(",", ".");
  const num = parseFloat(cleaned);
  return isNaN(num) || num <= 0 ? null : num;
}

export default function ImportMenuDialog({ open, onOpenChange, organization }: Props) {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("upload");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<string, FieldKey | "">>({}); 
  const [importing, setImporting] = useState(false);
  const [resultMsg, setResultMsg] = useState("");

  const reset = () => {
    setStep("upload");
    setHeaders([]);
    setRows([]);
    setMapping({});
    setImporting(false);
    setResultMsg("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  /* ---------- STEP 1: parse file ---------- */
  const handleFile = async (file: File) => {
    try {
      const ext = file.name.split(".").pop()?.toLowerCase();

      let parsedHeaders: string[] = [];
      let parsedRows: string[][] = [];

      if (ext === "csv" || ext === "txt") {
        const text = await file.text();
        const result = Papa.parse<string[]>(text, { header: false, skipEmptyLines: true });
        if (result.data.length < 2) throw new Error("Arquivo vazio ou sem dados.");
        parsedHeaders = result.data[0];
        parsedRows = result.data.slice(1);
      } else if (ext === "xlsx" || ext === "xls") {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: "" });
        if (json.length < 2) throw new Error("Arquivo vazio ou sem dados.");
        parsedHeaders = (json[0] as string[]).map(String);
        parsedRows = json.slice(1).map((r) => (r as string[]).map(String));
      } else {
        throw new Error("Formato não suportado. Use .csv, .xlsx ou .xls");
      }

      setHeaders(parsedHeaders);
      setRows(parsedRows);

      // Auto-guess mapping
      const initial: Record<string, FieldKey | ""> = {};
      parsedHeaders.forEach((h) => {
        const lower = h.toLowerCase().trim();
        if (lower.includes("nome") || lower === "name" || lower === "produto") initial[h] = "name";
        else if (lower.includes("preço") || lower.includes("preco") || lower === "price" || lower === "valor") initial[h] = "price";
        else if (lower.includes("descri") || lower === "description") initial[h] = "description";
        else if (lower.includes("categ") || lower === "category") initial[h] = "category";
        else initial[h] = "";
      });
      setMapping(initial);
      setStep("mapping");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao ler o arquivo. Verifique se os preços estão corretos.");
    }
  };

  /* ---------- STEP 2: check required ---------- */
  const mappedFields = Object.values(mapping);
  const hasName = mappedFields.includes("name");
  const hasPrice = mappedFields.includes("price");
  const canImport = hasName && hasPrice;

  const previewRows = rows.slice(0, 3);

  const setFieldMapping = (header: string, value: string) => {
    setMapping((prev) => {
      const next = { ...prev };
      // Remove duplicate if another header had this value
      if (value) {
        for (const k of Object.keys(next)) {
          if (next[k] === value) next[k] = "";
        }
      }
      next[header] = value as FieldKey | "";
      return next;
    });
  };

  /* ---------- STEP 3: process & insert ---------- */
  const doImport = async () => {
    setImporting(true);
    try {
      const nameIdx = headers.findIndex((h) => mapping[h] === "name");
      const priceIdx = headers.findIndex((h) => mapping[h] === "price");
      const descIdx = headers.findIndex((h) => mapping[h] === "description");
      const catIdx = headers.findIndex((h) => mapping[h] === "category");

      let valid = 0;
      let invalid = 0;

      const items: {
        organization_id: string;
        name: string;
        price: number;
        description: string | null;
        category: string;
        available: boolean;
        hide_global_addons: boolean;
      }[] = [];

      for (const row of rows) {
        const rawName = (row[nameIdx] ?? "").trim();
        const rawPrice = parsePrice(row[priceIdx]);
        if (!rawName || rawPrice === null) {
          invalid++;
          continue;
        }
        items.push({
          organization_id: organization.id,
          name: rawName,
          price: rawPrice,
          description: descIdx >= 0 ? (row[descIdx] ?? "").trim() || null : null,
          category: catIdx >= 0 && (row[catIdx] ?? "").trim() ? row[catIdx].trim() : "Outros",
          available: true,
          hide_global_addons: false,
        });
        valid++;
      }

      if (valid === 0) {
        toast.error("Nenhum produto válido encontrado. Verifique se os preços estão corretos.");
        setImporting(false);
        return;
      }

      // Bulk insert in batches of 500
      const BATCH = 500;
      for (let i = 0; i < items.length; i += BATCH) {
        const batch = items.slice(i, i + BATCH);
        const { error } = await supabase.from("menu_items").insert(batch);
        if (error) throw error;
      }

      await queryClient.invalidateQueries({ queryKey: ["menu_items", organization.id] });

      const msg = `${valid} produto${valid > 1 ? "s" : ""} importado${valid > 1 ? "s" : ""} com sucesso!${invalid > 0 ? ` (${invalid} linha${invalid > 1 ? "s" : ""} ignorada${invalid > 1 ? "s" : ""})` : ""}`;
      setResultMsg(msg);
      toast.success(msg);
      setStep("result");
    } catch (err: any) {
      console.error("[ImportMenu]", err);
      toast.error("Erro ao importar produtos. Tente novamente.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Importar Cardápio (CSV/Excel)
          </DialogTitle>
          <DialogDescription>
            Importe seus produtos de uma planilha. Arquivos aceitos: .csv, .xlsx, .xls
          </DialogDescription>
        </DialogHeader>

        {/* STEP 1: Upload */}
        {step === "upload" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="border-2 border-dashed border-border rounded-xl p-10 text-center w-full cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="font-medium text-foreground mb-1">Clique para selecionar o arquivo</p>
              <p className="text-sm text-muted-foreground">CSV, XLSX ou XLS</p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
          </div>
        )}

        {/* STEP 2: Mapping */}
        {step === "mapping" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Mapeie as colunas do seu arquivo para os campos do sistema.
              <span className="text-destructive font-medium"> * Obrigatório</span>
            </p>

            <div className="space-y-3">
              {headers.map((h) => (
                <div key={h} className="flex items-center gap-3">
                  <span className="text-sm font-medium min-w-[120px] truncate" title={h}>{h}</span>
                  <span className="text-muted-foreground">→</span>
                  <Select value={mapping[h] || "none"} onValueChange={(v) => setFieldMapping(h, v === "none" ? "" : v)}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Ignorar coluna" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Ignorar coluna</SelectItem>
                      {SYSTEM_FIELDS.map((f) => (
                        <SelectItem key={f.value} value={f.value}>
                          {f.label}{f.required ? " *" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            {/* Preview */}
            {previewRows.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Pré-visualização ({Math.min(3, rows.length)} de {rows.length} linhas):</p>
                <div className="overflow-x-auto border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {headers.map((h) => (
                          <TableHead key={h} className="text-xs whitespace-nowrap">{h}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewRows.map((row, i) => (
                        <TableRow key={i}>
                          {row.map((cell, j) => (
                            <TableCell key={j} className="text-xs py-1.5 whitespace-nowrap">{cell}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {!canImport && (
              <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                <AlertTriangle className="w-4 h-4" />
                Mapeie ao menos "Nome do Produto" e "Preço" para continuar.
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={reset}>Voltar</Button>
              <Button onClick={doImport} disabled={!canImport || importing}>
                {importing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Importar {rows.length} produto{rows.length > 1 ? "s" : ""}
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: Result */}
        {step === "result" && (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <CheckCircle2 className="w-12 h-12 text-green-500" />
            <p className="font-medium text-foreground">{resultMsg}</p>
            <Button onClick={() => handleOpenChange(false)}>Fechar</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
