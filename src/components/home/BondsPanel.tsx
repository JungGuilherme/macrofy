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

function BondsTable({ title, rows, loading, note, updatedAt }: {
  title: string; rows: BondRow[]; loading: boolean; note?: string; updatedAt?: Date | null;
}) {
  return (
    <div className="bg-card rounded-xl border p-4">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <Landmark className="h-4 w-4 text-primary flex-shrink-0" />
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide truncate">{title}</h3>
        </div>
        {updatedAt && (
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider flex-shrink-0" style={MONO}>
            atualizado {updatedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        )}
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

// Primary: CNBC's public quote API (Tradeweb, real-time, CORS-enabled).
// Fallback: Yahoo yield indices cached in market_quotes.
const CNBC_SYMBOLS: [string, string][] = [
  ['US3M', 'US 3M'],
  ['US1Y', 'US 1Y'],
  ['US2Y', 'US 2Y'],
  ['US5Y', 'US 5Y'],
  ['US10Y', 'US 10Y'],
  ['US20Y', 'US 20Y'],
  ['US30Y', 'US 30Y'],
];
const CNBC_URL =
  'https://quote.cnbc.com/quote-html-webservice/restQuote/symbolType/symbol?symbols=' +
  CNBC_SYMBOLS.map(([s]) => s).join('|') +
  '&requestMethod=itv&noform=1&partnerId=2&fund=1&exthrs=1&output=json';

const YAHOO_FALLBACK: [string, string][] = [
  ['^IRX', 'US 3M'],
  ['2YY=F', 'US 2Y'],
  ['^FVX', 'US 5Y'],
  ['^TNX', 'US 10Y'],
  ['^TYX', 'US 30Y'],
];

function useUsTreasuries() {
  return useQuery({
    queryKey: ['bonds-us'],
    queryFn: async (): Promise<{ rows: BondRow[]; at: Date; source: 'cnbc' | 'cache' }> => {
      try {
        const res = await fetch(CNBC_URL);
        if (!res.ok) throw new Error(`CNBC HTTP ${res.status}`);
        const json = await res.json();
        const list = json?.FormattedQuoteResult?.FormattedQuote ?? [];
        const rows = CNBC_SYMBOLS
          .map(([symbol, name]) => {
            const q = list.find((x: any) => x.symbol === symbol);
            const y = parseFloat(String(q?.last ?? '').replace('%', ''));
            const chg = parseFloat(String(q?.change ?? '').replace('+', ''));
            if (!q || isNaN(y)) return null;
            return { name, yield_: y, chg: isNaN(chg) ? null : chg };
          })
          .filter((x): x is BondRow => !!x);
        if (rows.length === 0) throw new Error('empty');
        return { rows, at: new Date(), source: 'cnbc' };
      } catch {
        // fallback: Yahoo yield indices from the quote cache
        const { data } = await (supabase as any)
          .from('market_quotes')
          .select('*')
          .in('symbol', YAHOO_FALLBACK.map(([s]) => s));
        const rows = YAHOO_FALLBACK
          .map(([symbol, name]) => {
            const r = (data ?? []).find((q: any) => q.symbol === symbol);
            if (!r) return null;
            return { name, yield_: Number(r.price), chg: Number(r.change) };
          })
          .filter((x): x is BondRow => !!x);
        return { rows, at: new Date(), source: 'cache' };
      }
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

/** All January contracts (the liquid vertices), plus the front contract
 *  when it isn't a January — the whole readable curve. */
function pickDiVertices(contracts: DiContract[]): DiContract[] {
  const sorted = [...contracts].sort(
    (a, b) => a.year - b.year || 'FGHJKMNQUVXZ'.indexOf(a.month) - 'FGHJKMNQUVXZ'.indexOf(b.month)
  );
  const jans = sorted.filter((c) => c.month === 'F');
  if (jans.length < 3) return sorted;
  const front = sorted[0];
  return front.month !== 'F' ? [front, ...jans] : jans;
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

  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

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
        setUpdatedAt(new Date());
        return;
      }
      throw new Error('empty curve');
    } catch {
      try {
        if (await loadTesouro()) setUpdatedAt(new Date());
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

  return { rows, loading, source, updatedAt };
}

/* ── panel ── */

export function BondsPanel() {
  const us = useUsTreasuries();
  const br = useBrCurve();

  const usRows = us.data?.rows ?? [];

  // Hide the whole panel only if both sides are empty after loading
  if (!us.isLoading && !br.loading && usRows.length === 0 && br.rows.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
      <BondsTable
        title="Juros Brasil — Curva DI"
        rows={br.rows}
        loading={br.loading}
        updatedAt={br.updatedAt}
        note={
          br.source === 'b3'
            ? 'Futuros DI1 — B3 (delay ~15 min) · variação vs. ajuste anterior, em p.p.'
            : 'Tesouro Prefixado (fallback) · variação vs. dia útil anterior, em p.p.'
        }
      />
      <BondsTable
        title="Treasuries — EUA"
        rows={usRows}
        loading={us.isLoading}
        updatedAt={us.data?.at ?? null}
        note={
          us.data?.source === 'cnbc'
            ? 'CNBC/Tradeweb (tempo real) · variação do dia, em p.p.'
            : 'Yahoo Finance (cache) · variação do dia, em p.p.'
        }
      />
    </div>
  );
}
