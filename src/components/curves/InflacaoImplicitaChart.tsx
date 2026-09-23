import { Loader2, RefreshCw } from "lucide-react";
import {
  CartesianGrid, LabelList, Line, LineChart, ReferenceArea, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import logoAvXp from "@/assets/logo-av-xp.svg";

export interface ImplicitaRow {
  vencimento: string;
  vencimento_data: string;
  implicita: number | null;
}

// Meta de inflação (mesma referência usada nos cards do Brasil: 3,0% ±1,5pp)
const META_INFLACAO = 3;
const TOLERANCIA = 1.5;
const BANDA_MIN = META_INFLACAO - TOLERANCIA;
const BANDA_MAX = META_INFLACAO + TOLERANCIA;

const fmt = (n: number) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

interface Props {
  rows: ImplicitaRow[];
  loading: boolean;
  onRefresh: () => void;
  footer?: React.ReactNode;
}

/** Curva de inflação implícita por vértice de NTN-B — usa exatamente a coluna
 *  "Implícita" da tabela NTNB FECHAMENTO (mesma interpolação escolhida). */
export default function InflacaoImplicitaChart({ rows, loading, onRefresh, footer }: Props) {
  const data = rows
    .filter((r): r is ImplicitaRow & { implicita: number } => r.implicita != null)
    .map((r) => ({ vencimento: r.vencimento, data: r.vencimento_data, implicita: r.implicita }));

  // Eixo Y em passos inteiros, sempre incluindo a banda da meta inteira
  const values = data.map((d) => d.implicita);
  const yMin = Math.floor(Math.min(...values, BANDA_MIN));
  const yMax = Math.ceil(Math.max(...values, BANDA_MAX));
  const yTicks = Array.from({ length: yMax - yMin + 1 }, (_, i) => yMin + i);

  return (
    <Card className="max-w-3xl overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 bg-[hsl(var(--primary))] text-primary-foreground rounded-t-lg">
        <div className="flex items-center gap-3">
          <img src={logoAvXp} alt="AV XP" className="h-5 w-auto" />
          <CardTitle className="text-base font-semibold tracking-wide">INFLAÇÃO IMPLÍCITA — NTN-B</CardTitle>
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
        <div className="w-full bg-card" style={{ minHeight: 340 }}>
          {data.length > 0 ? (
            <ResponsiveContainer width="100%" height={340}>
              <LineChart data={data} margin={{ top: 28, right: 28, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="vencimento"
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  interval={0}
                  padding={{ left: 16, right: 16 }}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  tickFormatter={(v) => `${v}%`}
                  domain={[yMin, yMax]}
                  ticks={yTicks}
                />
                <ReferenceArea
                  y1={BANDA_MIN}
                  y2={BANDA_MAX}
                  fill="hsl(var(--primary))"
                  fillOpacity={0.08}
                  stroke="hsl(var(--primary))"
                  strokeOpacity={0.25}
                  strokeDasharray="2 3"
                  label={{
                    value: "Banda da meta (1,5%–4,5%)",
                    position: "insideTopRight",
                    fill: "hsl(var(--muted-foreground))",
                    fontSize: 11,
                  }}
                />
                <ReferenceLine
                  y={META_INFLACAO}
                  stroke="hsl(var(--muted-foreground))"
                  strokeDasharray="5 4"
                  label={{
                    value: "Meta 3,0%",
                    position: "insideBottomRight",
                    fill: "hsl(var(--muted-foreground))",
                    fontSize: 11,
                  }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    color: "hsl(var(--popover-foreground))",
                    fontSize: 12,
                  }}
                  formatter={(value: number) => [`${fmt(value)}%`, "Implícita"]}
                  labelFormatter={(label, payload) => {
                    const iso = payload?.[0]?.payload?.data as string | undefined;
                    return iso ? `${label} · venc. ${fmtDate(iso)}` : String(label);
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="implicita"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ r: 4, fill: "hsl(var(--primary))" }}
                  activeDot={{ r: 6 }}
                  isAnimationActive={false}
                >
                  <LabelList
                    dataKey="implicita"
                    position="top"
                    offset={10}
                    formatter={(v: number) => fmt(v)}
                    style={{ fontSize: 10, fill: "hsl(var(--foreground))" }}
                  />
                </Line>
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[340px] text-muted-foreground">
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" /> Carregando dados...
                </div>
              ) : (
                <p>Sem dados disponíveis</p>
              )}
            </div>
          )}
        </div>
        {footer && <div className="px-4 py-3 border-t">{footer}</div>}
      </CardContent>
    </Card>
  );
}
