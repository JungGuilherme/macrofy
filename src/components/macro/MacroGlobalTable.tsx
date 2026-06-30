import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpDown, ArrowUp, ArrowDown, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useGlobalMacroData, type GlobalMacroRow } from "@/hooks/useGlobalMacroData";
import { Skeleton } from "@/components/ui/skeleton";
import { useLang, type Lang } from "@/contexts/LanguageContext";



const COUNTRY_NAMES: Record<string, Record<Lang, string>> = {
  USA: { pt: "Estados Unidos", en: "United States" },
  BRA: { pt: "Brasil", en: "Brazil" },
  XC:  { pt: "Zona do Euro", en: "Euro Area" },
  CHN: { pt: "China", en: "China" },
  JPN: { pt: "Japão", en: "Japan" },
  DEU: { pt: "Alemanha", en: "Germany" },
  GBR: { pt: "Reino Unido", en: "United Kingdom" },
  FRA: { pt: "França", en: "France" },
  IND: { pt: "Índia", en: "India" },
  ITA: { pt: "Itália", en: "Italy" },
  CAN: { pt: "Canadá", en: "Canada" },
  KOR: { pt: "Coreia do Sul", en: "South Korea" },
  MEX: { pt: "México", en: "Mexico" },
  AUS: { pt: "Austrália", en: "Australia" },
  ESP: { pt: "Espanha", en: "Spain" },
  CHE: { pt: "Suíça", en: "Switzerland" },
  TUR: { pt: "Turquia", en: "Turkey" },
  IDN: { pt: "Indonésia", en: "Indonesia" },
  RUS: { pt: "Rússia", en: "Russia" },
};

interface ColumnDef {
  key: string;
  label: Record<Lang, string>;
  tooltip: Record<Lang, string>;
  decimals: number;
  suffix: string;
  polarity: string;
}

const COLUMNS: ColumnDef[] = [
  { key: "gdp_yoy", label: { pt: "PIB A/A", en: "GDP YoY" }, tooltip: { pt: "PIB variação anual", en: "GDP year-over-year change" }, decimals: 1, suffix: "%", polarity: "higher_better" },
  { key: "gdp_qoq", label: { pt: "PIB T/T", en: "GDP QoQ" }, tooltip: { pt: "PIB variação trimestral", en: "GDP quarter-over-quarter" }, decimals: 1, suffix: "%", polarity: "higher_better" },
  { key: "cpi_yoy", label: { pt: "Inflação A/A", en: "CPI YoY" }, tooltip: { pt: "Inflação ao consumidor (anual)", en: "Consumer price inflation (annual)" }, decimals: 1, suffix: "%", polarity: "neutral" },
  { key: "core_cpi_yoy", label: { pt: "Núcleo CPI", en: "Core CPI" }, tooltip: { pt: "Núcleo da inflação (anual)", en: "Core inflation (annual)" }, decimals: 1, suffix: "%", polarity: "neutral" },
  { key: "policy_rate", label: { pt: "Taxa de Juros", en: "Policy Rate" }, tooltip: { pt: "Taxa de juros de referência", en: "Reference interest rate" }, decimals: 2, suffix: "%", polarity: "neutral" },
  { key: "ten_y_yield", label: { pt: "Yield 10A", en: "10Y Yield" }, tooltip: { pt: "Yield do título de 10 anos", en: "10-year bond yield" }, decimals: 2, suffix: "%", polarity: "neutral" },
  { key: "unemployment", label: { pt: "Desemprego", en: "Unemployment" }, tooltip: { pt: "Taxa de desemprego", en: "Unemployment rate" }, decimals: 1, suffix: "%", polarity: "lower_better" },
  { key: "current_account_gdp", label: { pt: "C/C / PIB", en: "C/A / GDP" }, tooltip: { pt: "Conta corrente em % do PIB", en: "Current account as % of GDP" }, decimals: 1, suffix: "%", polarity: "higher_better" },
  { key: "govt_debt_gdp", label: { pt: "Dívida / PIB", en: "Debt / GDP" }, tooltip: { pt: "Dívida pública em % do PIB", en: "Government debt as % of GDP" }, decimals: 1, suffix: "%", polarity: "lower_better" },
];

const UI_TEXT: Record<string, Record<Lang, string>> = {
  country: { pt: "País", en: "Country" },
  sync: { pt: "Sincronizar Dados", en: "Sync Data" },
  synced: { pt: "Dados globais sincronizados", en: "Global data synced" },
  syncError: { pt: "Erro ao sincronizar", en: "Sync error" },
  source: { pt: "Fonte", en: "Source" },
  updated: { pt: "Atualizado", en: "Updated" },
};

const COUNTRY_LINKS: Record<string, string> = {
  BRA: "/macro/brasil",
  USA: "/macro/eua",
};

function getColumnRange(data: GlobalMacroRow[], key: string) {
  const vals = data
    .map((d) => (d as any)[key])
    .filter((v): v is number => v !== null && typeof v === "number");
  if (vals.length === 0) return { min: 0, max: 0 };
  return { min: Math.min(...vals), max: Math.max(...vals) };
}

function getCellColor(value: number | null, polarity: string, min: number, max: number): string {
  if (value === null || polarity === "neutral" || max === min) return "";
  const range = max - min;
  const normalized = (value - min) / range;
  let intensity: number;
  if (polarity === "higher_better") {
    intensity = normalized;
  } else {
    intensity = 1 - normalized;
  }
  if (intensity > 0.6) {
    const alpha = Math.min(0.15, (intensity - 0.5) * 0.3);
    return `rgba(34, 171, 100, ${alpha})`;
  } else if (intensity < 0.4) {
    const alpha = Math.min(0.15, (0.5 - intensity) * 0.3);
    return `rgba(220, 70, 70, ${alpha})`;
  }
  return "";
}

function sourceLabel(source: string | null): string {
  switch (source) {
    case "bcb": return "BCB/IBGE";
    case "fred": return "FRED/BEA";
    case "worldbank": return "World Bank";
    case "dbnomics": return "DBnomics";
    default: return "Manual";
  }
}

type SortDir = "asc" | "desc" | null;

export default function MacroGlobalTable() {
  const navigate = useNavigate();
  const { data: globalData, isLoading, refetch } = useGlobalMacroData();
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [syncing, setSyncing] = useState(false);
  const { lang } = useLang();

  const handleSort = (col: string) => {
    if (sortCol === col) {
      if (sortDir === "asc") setSortDir("desc");
      else if (sortDir === "desc") { setSortCol(null); setSortDir(null); }
      else setSortDir("asc");
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { error } = await supabase.functions.invoke("sync-macro-global");
      if (error) throw error;
      toast.success(UI_TEXT.synced[lang]);
      refetch();
    } catch (err: any) {
      toast.error(`${UI_TEXT.syncError[lang]}: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const sortedData = useMemo(() => {
    if (!globalData) return [];
    if (!sortCol || !sortDir) return globalData;
    return [...globalData].sort((a, b) => {
      const aVal = (a as any)[sortCol];
      const bVal = (b as any)[sortCol];
      if (aVal === null && bVal === null) return 0;
      if (aVal === null) return 1;
      if (bVal === null) return -1;
      const cmp = (aVal as number) - (bVal as number);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [globalData, sortCol, sortDir]);

  const ranges = useMemo(() => {
    if (!globalData) return {};
    const map: Record<string, { min: number; max: number }> = {};
    COLUMNS.forEach((col) => {
      map[col.key] = getColumnRange(globalData, col.key);
    });
    return map;
  }, [globalData]);

  const getCountryName = (row: GlobalMacroRow) => {
    return COUNTRY_NAMES[row.country_code]?.[lang] || row.country_name;
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
          {UI_TEXT.sync[lang]}
        </Button>
      </div>

      <div className="rounded-lg border border-border overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse" style={{ minWidth: 1100 }}>
            <thead>
              <tr className="bg-muted/50">
                <th
                  className="sticky left-0 z-20 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-muted/50 border-r border-border/30"
                  style={{ minWidth: 180 }}
                >
                  {UI_TEXT.country[lang]}
                </th>
                {COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer hover:bg-muted/80 transition-colors select-none"
                    style={{ minWidth: 90 }}
                    onClick={() => handleSort(col.key)}
                  >
                    <Tooltip delayDuration={300}>
                      <TooltipTrigger asChild>
                        <div className="flex items-center justify-center gap-1">
                          <span>{col.label[lang]}</span>
                          {sortCol === col.key ? (
                            sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                          ) : (
                            <ArrowUpDown className="h-3 w-3 opacity-30" />
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        {col.tooltip[lang]}
                      </TooltipContent>
                    </Tooltip>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedData.map((row) => {
                const link = COUNTRY_LINKS[row.country_code];
                return (
                  <tr
                    key={row.country_code}
                    className={cn(
                      "border-b border-border/30 transition-colors hover:bg-muted/30",
                      link && "cursor-pointer"
                    )}
                    onClick={() => link && navigate(link)}
                  >
                    <td className="sticky left-0 z-10 px-4 py-2.5 text-sm font-medium text-foreground bg-card border-r border-border/30">
                      <Tooltip delayDuration={300}>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-2">
                            <span className="text-base">{row.flag || ""}</span>
                            <span className={cn(link && "underline decoration-dotted underline-offset-2")}>
                              {getCountryName(row)}
                            </span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="text-xs">
                          {UI_TEXT.source[lang]}: {sourceLabel(row.source)}
                          {row.updated_at && (
                            <> · {UI_TEXT.updated[lang]}: {new Date(row.updated_at).toLocaleDateString(lang === "pt" ? "pt-BR" : "en-US")}</>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    </td>
                    {COLUMNS.map((col) => {
                      const val = (row as any)[col.key] as number | null;
                      const range = ranges[col.key] || { min: 0, max: 0 };
                      const bgColor = getCellColor(val, col.polarity, range.min, range.max);
                      return (
                        <td
                          key={col.key}
                          className="px-3 py-2.5 text-center text-sm tabular-nums text-foreground"
                          style={bgColor ? { backgroundColor: bgColor } : undefined}
                        >
                          {val !== null ? `${val.toFixed(col.decimals)}${col.suffix}` : "–"}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
