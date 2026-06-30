import { useEffect, useState, useCallback } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

import logoAvXp from "@/assets/logo-av-xp.svg";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

interface Row {
  vencimento: string;
  vencimento_data: string;
  taxa: number;
  variacao_bps: number | null;
  implicita: number | null;
}

const fmt = (n: number | null, digits = 2) =>
  n == null ? "—" : n.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });

const fmtDate = (iso: string) => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

const MESES_PT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const fmtMesAno = (iso: string) => {
  if (!iso) return "";
  const [y, m] = iso.split("-");
  const mi = Number(m) - 1;
  return `${MESES_PT[mi] ?? m}/${y}`;
};

function VarCell({ value }: { value: number | null }) {
  return (
    <TableCell
      className={cn(
        "text-right py-2 tabular-nums font-medium",
        value == null
          ? "text-muted-foreground"
          : value < 0
          ? "text-red-600 dark:text-red-400"
          : value > 0
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-muted-foreground",
      )}
    >
      {value == null ? "—" : `${value > 0 ? "+" : ""}${fmt(value)}`}
    </TableCell>
  );
}

interface FechamentoTableProps {
  title: string;
  rows: Row[];
  loading: boolean;
  showImplicita: boolean;
  onRefresh: () => void;
  footer?: React.ReactNode;
}

function FechamentoTable({ title, rows, loading, showImplicita, onRefresh, footer }: FechamentoTableProps) {
  return (
    <Card className="max-w-2xl">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 bg-[hsl(var(--primary))] text-primary-foreground rounded-t-lg">
        <div className="flex items-center gap-3">
          <img src={logoAvXp} alt="AV XP" className="h-5 w-auto" />
          <CardTitle className="text-base font-semibold tracking-wide">{title}</CardTitle>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          disabled={loading}
          className="text-primary-foreground hover:bg-white/10 h-7"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="h-9">Vencimento</TableHead>
              <TableHead className="h-9 text-right">Taxa</TableHead>
              <TableHead className="h-9 text-right">Variação (bps)</TableHead>
              {showImplicita && <TableHead className="h-9 text-right">Implícita</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={showImplicita ? 4 : 3} className="text-center text-muted-foreground py-6">
                  Sem dados disponíveis
                </TableCell>
              </TableRow>
            )}
            {rows.map((r) => (
              <TableRow key={r.vencimento_data}>
                <TableCell className="font-medium py-2">
                  {showImplicita ? r.vencimento : fmtMesAno(r.vencimento_data)}
                </TableCell>
                <TableCell className="text-right py-2 tabular-nums">{fmt(r.taxa)}</TableCell>
                <VarCell value={r.variacao_bps} />
                {showImplicita && (
                  <TableCell className="text-right py-2 tabular-nums">{fmt(r.implicita)}</TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {footer && <div className="px-4 py-3 border-t">{footer}</div>}
      </CardContent>
    </Card>
  );
}

type InterpMode = "linear" | "flat-forward";

export default function NtnbFechamentoPanel() {
  const { toast } = useToast();
  const [ntnb, setNtnb] = useState<Row[]>([]);
  const [ltn, setLtn] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [dataRef, setDataRef] = useState<string>("");
  const [dataAnt, setDataAnt] = useState<string | null>(null);
  const [interp, setInterp] = useState<InterpMode>("linear");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${SUPABASE_URL}/functions/v1/anbima-ntnb?interp=${interp}`, {
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro ao carregar ANBIMA");
      setNtnb(json.ntnb ?? json.rows ?? []);
      setLtn(json.ltn ?? []);
      setDataRef(json.data_referencia ?? "");
      setDataAnt(json.data_anterior ?? null);
    } catch (err) {
      toast({
        title: "Erro ao carregar fechamento ANBIMA",
        description: err instanceof Error ? err.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast, interp]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 max-w-2xl">
        <span className="text-xs text-muted-foreground">Interpolação da curva nominal:</span>
        <div className="inline-flex rounded-md border bg-background">
          <button
            type="button"
            onClick={() => setInterp("linear")}
            className={cn(
              "px-3 py-1 text-xs font-medium rounded-l-md transition-colors",
              interp === "linear" ? "bg-primary text-primary-foreground" : "hover:bg-muted",
            )}
          >
            Linear
          </button>
          <button
            type="button"
            onClick={() => setInterp("flat-forward")}
            className={cn(
              "px-3 py-1 text-xs font-medium rounded-r-md transition-colors border-l",
              interp === "flat-forward" ? "bg-primary text-primary-foreground" : "hover:bg-muted",
            )}
          >
            Flat-forward
          </button>
        </div>
      </div>
      {(() => {
        const footer = dataRef ? (
          <p className="text-xs text-muted-foreground">
            Fonte: ANBIMA · D0: {fmtDate(dataRef)}
            {dataAnt ? ` · D-1: ${fmtDate(dataAnt)}` : " · D-1: aguardando próximo snapshot"}
            {" · "}Implícita ({interp === "linear" ? "linear" : "flat-forward"})
          </p>
        ) : null;
        return (
          <>
            <FechamentoTable
              title="NTNB FECHAMENTO"
              rows={ntnb}
              loading={loading}
              showImplicita
              onRefresh={load}
              footer={footer}
            />
            <FechamentoTable
              title="DI FECHAMENTO"
              rows={ltn}
              loading={loading}
              showImplicita={false}
              onRefresh={load}
              footer={footer}
            />
          </>
        );
      })()}
    </div>
  );
}
