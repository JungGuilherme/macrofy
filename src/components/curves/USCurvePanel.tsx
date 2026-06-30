import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, RefreshCw, Plus, X } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { DateInputPicker } from "@/components/curves/DateInputPicker";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import logoAltaVista from "@/assets/logo-altavista.svg";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

const CURVE_COLORS = [
  "hsl(209, 96%, 40%)",
  "hsl(43, 76%, 49%)",
  "hsl(142, 71%, 45%)",
  "hsl(0, 84%, 60%)",
  "hsl(280, 65%, 60%)",
];

const MAX_CURVES = 5;

interface USCurvePoint {
  years: number;
  yield: number;
  label: string;
}

interface USCurveData {
  country: string;
  date: string;
  points: USCurvePoint[];
}

interface CurveConfig {
  id: number;
  date: Date;
}

export default function USCurvePanel() {
  const { toast } = useToast();
  const today = new Date();
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(today.getDate() - 7);

  const [curveConfigs, setCurveConfigs] = useState<CurveConfig[]>([
    { id: 1, date: today },
    { id: 2, date: oneWeekAgo },
  ]);
  const [curveData, setCurveData] = useState<(USCurveData | null)[]>([]);
  const [loading, setLoading] = useState(false);
  const hasFetched = useRef(false);

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
        curveConfigs.map(async (config): Promise<USCurveData | null> => {
          try {
            const dateStr = format(config.date, "yyyy-MM-dd");
            const url = `${SUPABASE_URL}/functions/v1/us-treasury-curve?date=${dateStr}`;
            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch(url, {
              headers: session?.access_token
                ? { Authorization: `Bearer ${session.access_token}` }
                : {},
            });
            if (!response.ok) {
              const error = await response.json();
              toast({
                title: "Erro ao carregar curva EUA",
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
  }, [curveConfigs, toast]);

  // Auto-fetch on mount
  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      fetchCurves();
    }
  }, [fetchCurves]);

  const chartData = useMemo(() => {
    if (!curveData.some((c) => c)) return [];

    // Collect all labels sorted by years
    const labelMap = new Map<string, number>();
    curveData.forEach((curve) => {
      if (curve) {
        curve.points.forEach((p) => {
          if (!labelMap.has(p.label)) labelMap.set(p.label, p.years);
        });
      }
    });

    const sortedLabels = Array.from(labelMap.entries())
      .sort((a, b) => a[1] - b[1])
      .map(([label]) => label);

    return sortedLabels.map((label) => {
      const point: Record<string, string | number | undefined> = { vencimento: label };
      curveData.forEach((curve, idx) => {
        if (curve) {
          const found = curve.points.find((p) => p.label === label);
          point[`curva${idx}`] = found?.yield;
        }
      });
      return point;
    });
  }, [curveData]);

  // Table data
  const tableData = useMemo(() => {
    const validCurves = curveData.filter((c): c is USCurveData => c !== null);
    if (validCurves.length === 0) return [];

    const labelMap = new Map<string, number>();
    validCurves.forEach((curve) => {
      curve.points.forEach((p) => {
        if (!labelMap.has(p.label)) labelMap.set(p.label, p.years);
      });
    });

    const sortedLabels = Array.from(labelMap.entries())
      .sort((a, b) => a[1] - b[1])
      .map(([label]) => label);

    return sortedLabels.map((label) => {
      const row: { vencimento: string; yields: (number | null)[] } = {
        vencimento: label,
        yields: [],
      };
      curveData.forEach((curve) => {
        if (curve) {
          const found = curve.points.find((p) => p.label === label);
          row.yields.push(found?.yield ?? null);
        } else {
          row.yields.push(null);
        }
      });
      return row;
    });
  }, [curveData]);

  const validCurveCount = curveData.filter((c) => c !== null).length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Controls */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="text-base">Configurações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
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
          </div>
        </CardContent>
      </Card>

      {/* Chart + Table */}
      <div className="lg:col-span-3 space-y-4">
        <Card className="overflow-hidden">
          <CardHeader className="bg-card-foreground/5 border-b">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-base">
                🇺🇸 EUA — Curva de Taxas Indicativas de Juros (US Treasury Yield Curve)
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
                      height={40}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                      tickFormatter={(v) => `${v}%`}
                      domain={["auto", "auto"]}
                      label={{ value: "Yield (%)", angle: -90, position: "insideLeft", fill: "hsl(var(--muted-foreground))" }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        color: "hsl(var(--popover-foreground))",
                      }}
                      formatter={(value: number) => [`${value?.toFixed(2)}%`, "Yield"]}
                      labelFormatter={(label) => `Maturity: ${label}`}
                    />
                    <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: 10 }} />
                    {curveData.map((curve, idx) =>
                      curve ? (
                        <Line
                          key={idx}
                          type="monotone"
                          dataKey={`curva${idx}`}
                          name={`Treasury — ${curve.date}`}
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
                    <p>Selecione as datas e clique em "Carregar Curvas"</p>
                  )}
                </div>
              )}
            </div>
            {validCurveCount > 0 && (
              <div className="px-4 py-3 border-t text-xs text-muted-foreground">
                Fonte: U.S. Department of the Treasury · Atualizado em {format(new Date(), "dd/MM/yyyy", { locale: ptBR })}
              </div>
            )}
          </CardContent>
        </Card>

        {validCurveCount > 0 && tableData.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Tabela comparativa — Treasuries</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Maturidade</TableHead>
                      {curveData.map((curve, idx) =>
                        curve ? (
                          <TableHead key={idx} className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: CURVE_COLORS[idx] }} />
                              <span className="text-xs">{curve.date}</span>
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
