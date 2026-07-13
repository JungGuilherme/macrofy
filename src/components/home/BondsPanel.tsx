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

/* ── Brazil DI curve — straight from B3's public (CORS-enabled) API ── */

const B3_DI_URL = 'https://cotacao.b3.com.br/mds/api/v1/DerivativeQuotation/DI1';
const MONTH_CODE: Record<string, string> = {
  F: 'Jan', G: 'Fev', H: 'Mar', J: 'Abr', K: 'Mai', M: 'Jun',
  N: 'Jul', Q: 'Ago', U: 'Set', V: 'Out', X: 'Nov', Z: 'Dez',
};

interface DiContract { symb: string; rate: number; prev: number; year: number; month: string }

async function fetchDiCurve(): Promise<DiContract[]> {
  const res = await fetch(B3_DI_URL);
  if (!res.ok) throw new Error(`B3 HTTP ${res.status}`);
  const json = await res.json();
  const out: DiContract[] = [];
  for (const s of json?.Scty ?? []) {
    const symb: string = s.symb ?? '';
    const m = symb.match(/^DI1([FGHJKMNQUVXZ])(\d{2})$/);
    const cur = s.SctyQtn?.curPrc;
    const prev = s.SctyQtn?.prvsDayAdjstmntPric;
    if (!m || !cur || cur <= 0) continue;
    out.push({
      symb,
      rate: cur,
      prev: prev && prev > 0 ? prev : cur,
      year: 2000 + parseInt(m[2]),
      month: m[1],
    });
  }
  return out;
}

/** Liquid vertices: January contracts across the curve (fallback: any). */
function pickDiVertices(contracts: DiContract[]): DiContract[] {
  const jans = contracts.filter((c) => c.month === 'F').sort((a, b) => a.year - b.year);
  const pool = jans.length >= 3 ? jans : [...contracts].sort((a, b) => a.year - b.year);
  if (pool.length <= 6) return pool;
  // first two years are the most watched; then space out to the long end
  const picked = [pool[0], pool[1]];
  const rest = pool.slice(2);
  const step = Math.max(1, Math.floor(rest.length / 4));
  for (let i = step - 1; i < rest.length && picked.length < 6; i += step) picked.push(rest[i]);
  const last = pool[pool.length - 1];
  if (!picked.includes(last)) picked[picked.length - 1] = last;
  return picked;
}

/* ── Tesouro pré fallback (previous behaviour) ── */

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
  const [source, setSource] = useState<'b3' | 'tesouro' | null>(null);

  // Fallback: Tesouro Prefixado curve, change vs previous business day
  const loadTesouro = useCallback(async () => {
    const today = await fetchCurve();
    if (!today || today.pontos.length === 0) return false;

    let prev: { base: string; pontos: CurvePoint[] } | null = null;
    const base = new Date(today.base + 'T00:00:00');
    for (let back = 1; back <= 5 && !prev; back++) {
      const d = new Date(base);
      d.setDate(d.getDate() - back);
      const candidate = await fetchCurve(d.toISOString().slice(0, 10));
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
    setSource('tesouro');
    return true;
  }, []);

  const load = useCallback(async () => {
    try {
      // Primary: B3 delayed feed (whole DI curve, browser-direct)
      const contracts = await fetchDiCurve();
      const picked = pickDiVertices(contracts);
      if (picked.length > 0) {
        setRows(
          picked.map((c) => ({
            name: `DI ${MONTH_CODE[c.month]}/${String(c.year).slice(2)}`,
            yield_: c.rate,
            chg: Number((c.rate - c.prev).toFixed(3)),
          }))
        );
        setSource('b3');
        return;
      }
      throw new Error('empty curve');
    } catch {
      try {
        await loadTesouro();
      } catch { /* keep whatever we have */ }
    } finally {
      setLoading(false);
    }
  }, [loadTesouro]);

  useEffect(() => {
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, [load]);

  return { rows, loading, source };
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
        title="Juros Brasil — Curva DI"
        rows={br.rows}
        loading={br.loading}
        note={
          br.source === 'b3'
            ? 'Futuros DI1 — B3 (delay ~15 min) · variação vs. ajuste anterior, em p.p.'
            : 'Tesouro Prefixado (fallback) · variação vs. dia útil anterior, em p.p.'
        }
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
