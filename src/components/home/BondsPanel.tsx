import { useCallback, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Landmark } from 'lucide-react';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

const MONO = { fontFamily: "'Roboto Mono', monospace" };

interface BondRow {
  name: string;
  yield_: number;
  chg: number | null; // in percentage points
}

/* ── shared table ── */

function BondsTable({ title, rows, loading, note }: {
  title: string; rows: BondRow[]; loading: boolean; note?: string;
}) {
  return (
    <div className="bg-card rounded-xl border p-4">
      <div className="flex items-center gap-2 mb-2">
        <Landmark className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">{title}</h3>
      </div>
      {loading ? (
        <div className="space-y-2 py-1">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-7 w-full" />)}
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">Dados indisponíveis.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
              <th className="text-left font-medium pb-1.5">Nome</th>
              <th className="text-right font-medium pb-1.5">Taxa</th>
              <th className="text-right font-medium pb-1.5">Var.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => {
              const up = (r.chg ?? 0) >= 0;
              return (
                <tr key={r.name}>
                  <td className="py-1.5 font-semibold text-foreground text-[13px]">{r.name}</td>
                  <td className="py-1.5 text-right tabular-nums text-foreground" style={MONO}>
                    {r.yield_.toFixed(3).replace('.', ',')}
                  </td>
                  <td
                    className={cn(
                      'py-1.5 text-right tabular-nums text-[13px] font-semibold',
                      r.chg === null ? 'text-muted-foreground' : up ? 'text-emerald-500' : 'text-red-500'
                    )}
                    style={MONO}
                  >
                    {r.chg === null ? '—' : (
                      <>
                        {up ? '+' : ''}{r.chg.toFixed(3).replace('.', ',')}{' '}
                        <span className="text-xs">{up ? '▲' : '▼'}</span>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      {note && <p className="text-[10px] text-muted-foreground mt-2">{note}</p>}
    </div>
  );
}

/* ── US treasuries from the market_quotes cache ── */

const US_ORDER: [string, string][] = [
  ['^TNX', 'US 10Y'],
  ['^TYX', 'US 30Y'],
  ['^FVX', 'US 5Y'],
  ['2YY=F', 'US 2Y'],
  ['^IRX', 'US 3M'],
];

function useUsTreasuries() {
  return useQuery({
    queryKey: ['bonds-us'],
    queryFn: async () => {
      const symbols = US_ORDER.map(([s]) => s);
      const { data, error } = await (supabase as any)
        .from('market_quotes')
        .select('*')
        .in('symbol', symbols);
      if (error) return [] as BondRow[];
      return US_ORDER
        .map(([symbol, name]) => {
          const r = (data ?? []).find((q: any) => q.symbol === symbol);
          if (!r) return null;
          return { name, yield_: Number(r.price), chg: Number(r.change) };
        })
        .filter((x): x is BondRow => !!x);
    },
    refetchInterval: 60 * 1000,
  });
}

/* ── Brazil pré curve (Tesouro Direto) with day-over-day change ── */

interface CurvePoint { anos: number; taxa: number; vencimento_label: string }

async function fetchCurve(dateStr?: string): Promise<{ base: string; pontos: CurvePoint[] } | null> {
  const { data: { session } } = await supabase.auth.getSession();
  const url = `${SUPABASE_URL}/functions/v1/tesouro-curva?tipo=PREFIXADA${dateStr ? `&data=${dateStr}` : ''}`;
  const res = await fetch(url, {
    headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
  });
  if (!res.ok) return null;
  const json = await res.json();
  return { base: json.data_base_usada, pontos: json.pontos ?? [] };
}

/** Pick a readable subset of maturities across the curve. */
function pickMaturities(pontos: CurvePoint[]): CurvePoint[] {
  const sorted = [...pontos].sort((a, b) => a.anos - b.anos);
  if (sorted.length <= 5) return sorted;
  const targets = [sorted[0].anos, 2, 4, 7, sorted[sorted.length - 1].anos];
  const chosen: CurvePoint[] = [];
  for (const t of targets) {
    const nearest = sorted.reduce((best, p) =>
      Math.abs(p.anos - t) < Math.abs(best.anos - t) ? p : best
    );
    if (!chosen.includes(nearest)) chosen.push(nearest);
  }
  return chosen;
}

function useBrCurve() {
  const [rows, setRows] = useState<BondRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const today = await fetchCurve();
      if (!today || today.pontos.length === 0) return;

      // previous business day: walk back from the base date until the
      // API returns an older base
      let prev: { base: string; pontos: CurvePoint[] } | null = null;
      const base = new Date(today.base + 'T00:00:00');
      for (let back = 1; back <= 5 && !prev; back++) {
        const d = new Date(base);
        d.setDate(d.getDate() - back);
        const dateStr = d.toISOString().slice(0, 10);
        const candidate = await fetchCurve(dateStr);
        if (candidate && candidate.base !== today.base && candidate.pontos.length > 0) {
          prev = candidate;
        }
      }

      const picked = pickMaturities(today.pontos);
      setRows(
        picked.map((p) => {
          const prevPoint = prev?.pontos.find((x) => x.vencimento_label === p.vencimento_label);
          return {
            name: `Pré ${p.vencimento_label}`,
            yield_: p.taxa,
            chg: prevPoint ? Number((p.taxa - prevPoint.taxa).toFixed(3)) : null,
          };
        })
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 15 * 60 * 1000);
    return () => clearInterval(t);
  }, [load]);

  return { rows, loading };
}

/* ── panel ── */

export function BondsPanel() {
  const us = useUsTreasuries();
  const br = useBrCurve();

  // Hide the whole panel only if both sides are empty after loading
  if (!us.isLoading && !br.loading && (us.data ?? []).length === 0 && br.rows.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <BondsTable
        title="Juros Brasil — Curva Pré"
        rows={br.rows}
        loading={br.loading}
        note="Tesouro Prefixado (Tesouro Transparente) · variação vs. dia útil anterior, em p.p."
      />
      <BondsTable
        title="Treasuries — EUA"
        rows={us.data ?? []}
        loading={us.isLoading}
        note="Yahoo Finance · variação do dia, em p.p."
      />
    </div>
  );
}
