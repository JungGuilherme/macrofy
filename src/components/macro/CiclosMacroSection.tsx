import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine, Cell,
} from "recharts";
import { useMacroCycle, type MacroCyclePoint } from "@/hooks/useMacroCycle";

const QUADRANT_COLOR: Record<string, string> = {
  Goldilocks: "#22c55e",
  "Reflação": "#eab308",
  "Estagflação": "#dc2626",
  "Deflação": "#3b82f6",
};

const QUADRANT_DESC: Record<string, string> = {
  Goldilocks: "Crescimento acelerando, inflação cedendo — ambiente ideal para ativos de risco.",
  "Reflação": "Crescimento e inflação subindo juntos — típico de início de ciclo/estímulo.",
  "Estagflação": "Crescimento cedendo com inflação subindo — cenário mais adverso para ativos de risco.",
  "Deflação": "Crescimento e inflação cedendo juntos — sinal de desaceleração.",
};

function QuadrantBadge({ quadrante }: { quadrante: string | null }) {
  if (!quadrante) return null;
  const color = QUADRANT_COLOR[quadrante] || "hsl(var(--muted-foreground))";
  return (
    <div className="inline-flex flex-col gap-1 rounded-lg border-l-4 bg-muted/40 px-4 py-2" style={{ borderLeftColor: color }}>
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Quadrante atual</span>
      <span className="text-base font-bold" style={{ color }}>{quadrante}</span>
    </div>
  );
}

export default function CiclosMacroSection() {
  const { history, latest, trajectory, isLoading } = useMacroCycle("BR");

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">Ciclos Macro — Brasil</CardTitle></CardHeader>
        <CardContent><Skeleton className="h-[340px] w-full" /></CardContent>
      </Card>
    );
  }

  if (!latest) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">Ciclos Macro — Brasil</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Sem dados ainda — o histórico é populado por `sync-macro-cycle`.</p>
        </CardContent>
      </Card>
    );
  }

  const points = history.filter((p) => p.growth_composite != null && p.inflacao_implicita_1a != null);
  const growthValues = points.map((p) => p.growth_composite as number);
  const yPad = Math.max(0.5, (Math.max(...growthValues, 0) - Math.min(...growthValues, 0)) * 0.15);
  const yDomain: [number, number] = [Math.min(...growthValues, 0) - yPad, Math.max(...growthValues, 0) + yPad];
  const inflValues = points.map((p) => p.inflacao_implicita_1a as number);
  const xMid = inflValues.length ? (Math.min(...inflValues) + Math.max(...inflValues)) / 2 : 4.5;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
        <div>
          <CardTitle className="text-base">Ciclos Macro — Brasil</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Composto de crescimento (z-score de séries BCB) vs. inflação implícita 1A (Tesouro Prefixado vs. IPCA+)
          </p>
        </div>
        <QuadrantBadge quadrante={latest.quadrante} />
      </CardHeader>
      <CardContent className="space-y-4">
        {latest.quadrante && (
          <p className="text-sm text-muted-foreground">{QUADRANT_DESC[latest.quadrante]}</p>
        )}

        <ResponsiveContainer width="100%" height={320}>
          <ScatterChart margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
            <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeOpacity={0.5} />
            <ReferenceLine x={xMid} stroke="hsl(var(--muted-foreground))" strokeOpacity={0.5} />
            <XAxis
              type="number"
              dataKey="inflacao_implicita_1a"
              name="Inflação Implícita 1A"
              unit="%"
              domain={["dataMin - 0.5", "dataMax + 0.5"]}
              fontSize={10}
              stroke="hsl(var(--muted-foreground))"
              label={{ value: "Inflação Implícita 1A (%)", position: "insideBottom", offset: -5, fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            />
            <YAxis
              type="number"
              dataKey="growth_composite"
              name="Crescimento"
              domain={yDomain}
              fontSize={10}
              stroke="hsl(var(--muted-foreground))"
              label={{ value: "Crescimento (z-score)", angle: -90, position: "insideLeft", fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            />
            <ZAxis range={[40, 40]} />
            <Tooltip
              cursor={{ strokeDasharray: "3 3" }}
              contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
              formatter={(value: number, name: string) => [typeof value === "number" ? value.toFixed(2) : value, name]}
              labelFormatter={() => ""}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0].payload as MacroCyclePoint;
                return (
                  <div className="rounded-lg border bg-card px-3 py-2 text-xs shadow-sm">
                    <div className="font-medium">{p.date}</div>
                    <div className="text-muted-foreground">Crescimento: {p.growth_composite?.toFixed(2)}</div>
                    <div className="text-muted-foreground">Infl. implícita 1A: {p.inflacao_implicita_1a?.toFixed(2)}%</div>
                    {p.quadrante && <div style={{ color: QUADRANT_COLOR[p.quadrante] }}>{p.quadrante}</div>}
                  </div>
                );
              }}
            />
            <Scatter data={points} fill="hsl(var(--primary))" opacity={0.35}>
              {points.map((p, i) => (
                <Cell key={i} fill={p.quadrante ? QUADRANT_COLOR[p.quadrante] : "hsl(var(--muted-foreground))"} />
              ))}
            </Scatter>
            <Scatter data={[latest]} shape="star">
              <Cell fill={latest.quadrante ? QUADRANT_COLOR[latest.quadrante] : "hsl(var(--primary))"} stroke="hsl(var(--foreground))" strokeWidth={1} />
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>

        {trajectory.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            {trajectory.map(({ label, point }) => (
              <div key={label} className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-md bg-muted/40">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: point.quadrante ? QUADRANT_COLOR[point.quadrante] : "hsl(var(--muted-foreground))" }}
                />
                <span className="text-muted-foreground">{label}:</span>
                <span className="font-medium">{point.quadrante || "—"}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
