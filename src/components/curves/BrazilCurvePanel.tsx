import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, TableIcon, RefreshCw, Plus, X, Download } from "lucide-react";
import { exportCurvasToExcel } from "@/lib/exportCurvasExcel";
import logoAltaVista from "@/assets/logo-altavista.svg";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { DateInputPicker } from "@/components/curves/DateInputPicker";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

const CURVE_COLORS = [
  "hsl(209, 96%, 40%)",
  "hsl(43, 76%, 49%)",
  "hsl(142, 71%, 45%)",
  "hsl(0, 84%, 60%)",
  "hsl(280, 65%, 60%)",
];

const MAX_CURVES = 5;

const CURVE_TYPES = [
  { value: "PREFIXADA", label: "Prefixada" },
  { value: "IPCA", label: "IPCA+" },
  { value: "SELIC", label: "Selic" },
  { value: "IGPM", label: "IGPM+" },
];

interface CurvePoint {
  anos: number;
  taxa: number;
  vencimento: string;
  vencimento_ano: number;
  vencimento_label: string;
}

interface CurveData {
  tipo: string;
  data_base_usada: string;
  taxa_coluna: string;
  pontos: CurvePoint[];
}

interface CurveConfig {
  id: number;
  date: Date;
}

export default function BrazilCurvePanel() {
  const { toast } = useToast();
  const today = new Date();
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(today.getDate() - 7);

  const [curveType, setCurveType] = useState("PREFIXADA");
  const [curveConfigs, setCurveConfigs] = useState<CurveConfig[]>([
    { id: 1, date: today },
    { id: 2, date: oneWeekAgo },
  ]);
  const [curveData, setCurveData] = useState<(CurveData | null)[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const hasFetched = useRef(false);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const referenceDate = curveConfigs[0]?.date ?? new Date();
      await exportCurvasToExcel(referenceDate);
      toast({ title: "Exportação concluída", description: "Arquivo Excel gerado com sucesso." });
    } catch (err) {
      toast({
        title: "Erro ao exportar",
        description: err instanceof Error ? err.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  }, [curveConfigs, toast]);

  const addCurve = useCallback(() => {
    if (curveConfigs.length >= MAX_CURVES) return;
    const nextId = Math.max(...curveConfigs.map((c) => c.id)) + 1;
    setCurveConfigs((prev) => [...prev, { id: nextId, date: new Date() }]);
  }, [curveConfigs]);

  const removeCurve = useCallback((id: number) => {
    setCurveConfigs((prev) => prev.filter((c) => c.id !== id));
    setCurveData((prev) => {
      const idx = curveConfigs.findIndex((c) => c.id === id);
      if (idx >= 0) {
        const newData = [...prev];
        newData.splice(idx, 1);
        return newData;
      }
      return prev;
    });
  }, [curveConfigs]);

  const updateCurveDate = useCallback((id: number, date: Date) => {
    setCurveConfigs((prev) =>
      prev.map((c) => (c.id === id ? { ...c, date } : c))
    );
  }, []);

  const fetchCurves = useCallback(async () => {
    setLoading(true);
    try {
      const results = await Promise.all(
        curveConfigs.map(async (config): Promise<CurveData | null> => {
          try {
            const dateStr = format(config.date, "yyyy-MM-dd");
            const url = `${SUPABASE_URL}/functions/v1/tesouro-curva?tipo=${curveType}&data=${dateStr}`;
            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch(url, {
              headers: session?.access_token
                ? { Authorization: `Bearer ${session.access_token}` }
                : {},
            });
            if (!response.ok) {
              const error = await response.json();
              toast({
                title: "Erro ao carregar curva",
                description: error.error || "Erro desconhecido",
                variant: "destructive",
              });
              return null;
            }
            return await response.json();
          } catch {
            return null;
          }
        })
      );
      setCurveData(results);
    } catch {
      toast({
        title: "Erro de conexão",
        description: "Não foi possível conectar ao servidor",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [curveConfigs, curveType, toast]);

  // Auto-fetch on mount
  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      fetchCurves();
    }
  }, [fetchCurves]);

  const chartData = useMemo(() => {
    if (curveData.length === 0 || !curveData.some((c) => c)) return [];

    const vencimentoMap = new Map<string, { ano: number; anos: number }>();
    curveData.forEach((curve) => {
      if (curve) {
        curve.pontos.forEach((p) => {
          if (!vencimentoMap.has(p.vencimento_label)) {
            vencimentoMap.set(p.vencimento_label, { ano: p.vencimento_ano, anos: p.anos });
          }
        });
      }
    });

    const sortedLabels = Array.from(vencimentoMap.entries())
      .sort((a, b) => a[1].ano - b[1].ano || a[1].anos - b[1].anos)
      .map(([label]) => label);

    return sortedLabels.map((label) => {
      const point: Record<string, string | number | undefined> = { vencimento: label };
      curveData.forEach((curve, idx) => {
        if (curve) {
          const found = curve.pontos.find((p) => p.vencimento_label === label);
          point[`curva${idx}`] = found?.taxa;
        }
      });
      return point;
    });
  }, [curveData]);

  const tableData = useMemo(() => {
    const validCurves = curveData.filter((c): c is CurveData => c !== null);
    if (validCurves.length === 0) return [];

    const vencimentoMap = new Map<string, { display: string; ano: number; anos: number }>();
    validCurves.forEach((curve) => {
      curve.pontos.forEach((p) => {
        if (!vencimentoMap.has(p.vencimento)) {
          vencimentoMap.set(p.vencimento, { display: p.vencimento, ano: p.vencimento_ano, anos: p.anos });
        }
      });
    });

    const sortedVencimentos = Array.from(vencimentoMap.entries())
      .sort((a, b) => a[1].ano - b[1].ano || a[1].anos - b[1].anos)
      .map(([venc]) => venc);

    return sortedVencimentos.map((venc) => {
      const row: { vencimento: string; yields: (number | null)[] } = { vencimento: venc, yields: [] };
      curveData.forEach((curve) => {
        if (curve) {
          const found = curve.pontos.find((p) => p.vencimento === venc);
          row.yields.push(found?.taxa ?? null);
        } else {
          row.yields.push(null);
        }
      });
      return row;
    });
  }, [curveData]);

  const curveTypeLabel = CURVE_TYPES.find((t) => t.value === curveType)?.label || curveType;
  const validCurveCount = curveData.filter((c) => c !== null).length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Controls */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="text-base">Configurações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label>Tipo de Curva</Label>
            <Select value={curveType} onValueChange={setCurveType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CURVE_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {curveConfigs.map((config, idx) => (
            <div
              key={config.id}
              className="space-y-3 p-3 rounded-lg border"
              style={{ borderLeftColor: CURVE_COLORS[idx], borderLeftWidth: 3 }}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Curva {idx + 1}</p>
                {idx > 0 && (
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeCurve(config.id)}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Data Base</Label>
                <DateInputPicker
                  date={config.date}
                  onChange={(d) => updateCurveDate(config.id, d)}
                />
              </div>
            </div>
          ))}

          {curveConfigs.length < MAX_CURVES && (
            <Button variant="outline" className="w-full" onClick={addCurve}>
              <Plus className="mr-2 h-4 w-4" /> Adicionar curva
            </Button>
          )}

          <div className="flex flex-col gap-2 pt-2">
            <Button onClick={fetchCurves} disabled={loading} className="w-full">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Carregar Curvas
            </Button>

            <Button variant="outline" className="w-full" onClick={handleExport} disabled={exporting}>
              {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Exportar Excel (DI + NTN-B)
            </Button>

            {validCurveCount > 0 && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full">
                    <TableIcon className="mr-2 h-4 w-4" /> Mostrar Dados
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
                  <DialogHeader>
                    <DialogTitle>Dados Completos — {curveTypeLabel}</DialogTitle>
                  </DialogHeader>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Vencimento</TableHead>
                        {curveData.map((curve, idx) =>
                          curve ? (
                            <TableHead key={idx} className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CURVE_COLORS[idx] }} />
                                {curve.data_base_usada}
                              </div>
                            </TableHead>
                          ) : null
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tableData.map((row, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{row.vencimento}</TableCell>
                          {row.yields.map((y, yIdx) => (
                            <TableCell key={yIdx} className="text-right">
                              {y !== null ? `${y.toFixed(2)}%` : "—"}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Chart */}
      <div className="lg:col-span-3 space-y-4">
        <Card className="overflow-hidden">
          <CardHeader className="bg-card-foreground/5 border-b">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-base">
                🇧🇷 Brasil — Curva de Taxas Indicativas ({curveTypeLabel})
              </CardTitle>
              <img src={logoAltaVista} alt="Alta Vista" className="h-6 w-auto" />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="w-full bg-card" style={{ minHeight: 420 }}>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={420}>
                  <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="vencimento"
                      stroke="hsl(var(--muted-foreground))"
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                      interval={0}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                      tickFormatter={(v) => `${v}%`}
                      domain={["auto", "auto"]}
                      label={{ value: "Taxa (%)", angle: -90, position: "insideLeft", fill: "hsl(var(--muted-foreground))" }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        color: "hsl(var(--popover-foreground))",
                      }}
                      formatter={(value: number) => [`${value?.toFixed(2)}%`, "Taxa"]}
                      labelFormatter={(label) => `Vencimento: ${label}`}
                    />
                    <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: 10 }} />
                    {curveData.map((curve, idx) =>
                      curve ? (
                        <Line
                          key={idx}
                          type="monotone"
                          dataKey={`curva${idx}`}
                          name={`${curveTypeLabel} — ${curve.data_base_usada}`}
                          stroke={CURVE_COLORS[idx]}
                          strokeWidth={2}
                          dot={{ r: 4, fill: CURVE_COLORS[idx] }}
                          activeDot={{ r: 6 }}
                          connectNulls
                        />
                      ) : null
                    )}
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[420px] text-muted-foreground">
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin" /> Carregando dados...
                    </div>
                  ) : (
                    <p>Selecione as configurações e clique em "Carregar Curvas"</p>
                  )}
                </div>
              )}
            </div>
            {validCurveCount > 0 && (
              <div className="px-4 py-3 border-t text-xs text-muted-foreground">
                Fonte: ANBIMA / Tesouro Nacional · Curva: {curveTypeLabel} · Atualizado em {format(new Date(), "dd/MM/yyyy", { locale: ptBR })}
              </div>
            )}
          </CardContent>
        </Card>

        {validCurveCount > 0 && tableData.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Tabela comparativa por vencimento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vencimento</TableHead>
                      {curveData.map((curve, idx) =>
                        curve ? (
                          <TableHead key={idx} className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: CURVE_COLORS[idx] }} />
                              <span className="text-xs">{curve.data_base_usada}</span>
                            </div>
                          </TableHead>
                        ) : null
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tableData.map((row, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{row.vencimento}</TableCell>
                        {row.yields.map((y, yIdx) => (
                          <TableCell key={yIdx} className="text-right font-semibold">
                            {y !== null ? (
                              <span className="text-primary">{y.toFixed(2)}%</span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
