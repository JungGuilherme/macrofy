import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useMacroSeriesHistory, useMacroMetadata } from '@/hooks/useMacroData';
import { Loader2 } from 'lucide-react';

export type MacroChartMode = 'level' | 'mom' | 'yoy';

interface MacroEmbedChartProps {
  country: string;
  seriesCode: string;
  mode?: MacroChartMode;
  months?: number;
}

function monthLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${months[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`;
}

/**
 * Live macro chart meant to be embedded inline inside report/article rich
 * text (via the RichTextEditor "Inserir gráfico" node). Always reflects the
 * current database — no static image ever goes stale.
 */
export function MacroEmbedChart({ country, seriesCode, mode = 'level', months = 24 }: MacroEmbedChartProps) {
  const { data: metadata } = useMacroMetadata();
  const { data: history, isLoading } = useMacroSeriesHistory(seriesCode, country);

  const meta = metadata?.find((m) => m.country === country && m.series_code === seriesCode);

  const data = useMemo(() => {
    if (!history) return [];
    const rows = history.slice(-months);
    return rows.map((r) => ({
      label: monthLabel(r.date),
      value: mode === 'yoy' ? r.yoy_value : mode === 'mom' ? r.mom_value : r.raw_value,
    })).filter((r) => r.value !== null);
  }, [history, months, mode]);

  const modeLabel = mode === 'yoy' ? 'variação 12 meses' : mode === 'mom' ? 'variação mensal' : 'nível';
  const title = meta ? `${meta.indicator} — ${modeLabel}` : `${seriesCode} — ${modeLabel}`;
  const unit = mode === 'level' ? (meta?.unit ?? '') : '%';

  if (isLoading) {
    return (
      <div className="not-prose flex items-center justify-center h-[220px] rounded-lg border border-border bg-card">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="not-prose flex items-center justify-center h-[120px] rounded-lg border border-border bg-card text-sm text-muted-foreground">
        Série "{seriesCode}" ({country}) sem dados disponíveis.
      </div>
    );
  }

  return (
    <div className="not-prose rounded-lg border border-border bg-card p-4 my-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{title}</p>
      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" width={44} unit={unit} />
            <Tooltip
              contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
              formatter={(v: number) => [`${v.toFixed(2)}${unit}`, '']}
            />
            <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[10px] text-muted-foreground mt-2">
        Fonte: {meta?.source ?? 'Macrofy'} · atualizado automaticamente
      </p>
    </div>
  );
}
