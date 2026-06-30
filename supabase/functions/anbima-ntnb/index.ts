// Edge function: anbima-ntnb
// Scrapes ANBIMA HTML result pages for NTN-B, LTN and NTN-F closing rates.
// Returns D0/D-1 variation in bps and implied inflation per NTN-B vertex,
// computed by interpolating the nominal curve (LTN + NTN-F) to each NTN-B
// maturity. Interpolation mode is selectable via ?interp=linear|flat-forward.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const MONTHS_EN = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
const BASE = 'https://www.anbima.com.br/informacoes/merc-sec/resultados';

type Papel = 'ntn-b' | 'ltn' | 'ntn-f';
type InterpMode = 'linear' | 'flat-forward';

interface Row {
  vencimento: string;
  vencimento_data: string;
  taxa: number;
  variacao_bps: number | null;
  implicita: number | null;
}

interface DayData {
  ntnb: Map<string, number>;
  ltn: Map<string, number>;
  ntnf: Map<string, number>;
}

function dateToAnbima(d: Date): string {
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${dd}${MONTHS_EN[d.getUTCMonth()]}${d.getUTCFullYear()}`;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function prevBizDay(d: Date): Date {
  const p = new Date(d);
  p.setUTCDate(p.getUTCDate() - 1);
  while (p.getUTCDay() === 0 || p.getUTCDay() === 6) p.setUTCDate(p.getUTCDate() - 1);
  return p;
}

function brToIso(br: string): string | null {
  const m = br.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

// DU approximation: corridos × 252/365 (rounded). Error in implied inflation < ~3 bps.
function duBetween(fromIso: string, toIso: string): number {
  const a = Date.UTC(+fromIso.slice(0, 4), +fromIso.slice(5, 7) - 1, +fromIso.slice(8, 10));
  const b = Date.UTC(+toIso.slice(0, 4), +toIso.slice(5, 7) - 1, +toIso.slice(8, 10));
  const corridos = Math.max(1, Math.round((b - a) / 86400000));
  return Math.max(1, Math.round((corridos * 252) / 365));
}

async function fetchPapel(date: Date, papel: Papel): Promise<Map<string, number> | null> {
  const url = `${BASE}/msec_${dateToAnbima(date)}_${papel}.asp`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'pt-BR,pt;q=0.9',
      'Referer': 'https://www.anbima.com.br/pt_br/informar/precos-e-indices/renda-fixa/titulos-publicos/mercado-secundario-de-titulos-publicos.htm',
      'Cache-Control': 'no-cache',
    },
  });
  if (!res.ok) return null;
  const buf = await res.arrayBuffer();
  const html = new TextDecoder('iso-8859-1').decode(buf);
  if (!html.includes('Tx. Indicativas')) return null;

  // <TD> groups of 8: [codigo, dataBase, vencimento, compra, venda, indicativa, PU, ...]
  const tdRe = /<TD[^>]*>([^<]*)<\/TD>/gi;
  const tds: string[] = [];
  let mm: RegExpExecArray | null;
  while ((mm = tdRe.exec(html)) !== null) tds.push(mm[1].trim());

  const out = new Map<string, number>();
  for (let i = 0; i < tds.length - 7; i++) {
    if (
      /^\d{2}\/\d{2}\/\d{4}$/.test(tds[i + 1]) &&
      /^\d{2}\/\d{2}\/\d{4}$/.test(tds[i + 2])
    ) {
      const iso = brToIso(tds[i + 2]);
      const taxa = Number(tds[i + 5].replace(',', '.'));
      if (iso && Number.isFinite(taxa) && taxa > 0) {
        out.set(iso, taxa);
        i += 7;
      }
    }
  }
  return out.size > 0 ? out : null;
}

async function fetchDay(date: Date): Promise<DayData | null> {
  const [ntnb, ltn, ntnf] = await Promise.all([
    fetchPapel(date, 'ntn-b'),
    fetchPapel(date, 'ltn'),
    fetchPapel(date, 'ntn-f'),
  ]);
  if (!ntnb && !ltn && !ntnf) return null;
  return { ntnb: ntnb ?? new Map(), ltn: ltn ?? new Map(), ntnf: ntnf ?? new Map() };
}

async function findLatestTwo(
  maxDays = 20,
): Promise<{ d0: Date; d1: Date; data0: DayData; data1: DayData } | null> {
  let probe = new Date();
  let d0: Date | null = null;
  let data0: DayData | null = null;
  for (let i = 0; i < maxDays; i++) {
    const r = await fetchDay(probe);
    if (r) { d0 = new Date(probe); data0 = r; break; }
    probe = prevBizDay(probe);
  }
  if (!d0 || !data0) return null;
  probe = prevBizDay(d0);
  for (let i = 0; i < maxDays; i++) {
    const r = await fetchDay(probe);
    if (r) return { d0, d1: new Date(probe), data0, data1: r };
    probe = prevBizDay(probe);
  }
  return null;
}

// Build sorted nominal curve [{iso, du, taxa}] from LTN + NTN-F (NTN-F wins on duplicates).
function buildNominalCurve(refIso: string, ltn: Map<string, number>, ntnf: Map<string, number>) {
  const merged = new Map<string, number>();
  for (const [iso, t] of ltn) merged.set(iso, t);
  for (const [iso, t] of ntnf) merged.set(iso, t); // NTN-F prioritized in the long end
  return Array.from(merged.entries())
    .map(([iso, taxa]) => ({ iso, du: duBetween(refIso, iso), taxa }))
    .filter((p) => p.du > 0)
    .sort((a, b) => a.du - b.du);
}

function interpolateNominal(
  duTarget: number,
  curve: { du: number; taxa: number }[],
  mode: InterpMode,
): number | null {
  if (curve.length === 0) return null;
  if (duTarget <= curve[0].du) return curve[0].taxa;
  if (duTarget >= curve[curve.length - 1].du) return curve[curve.length - 1].taxa;

  let lo = curve[0];
  let hi = curve[curve.length - 1];
  for (let i = 0; i < curve.length - 1; i++) {
    if (curve[i].du <= duTarget && curve[i + 1].du >= duTarget) {
      lo = curve[i]; hi = curve[i + 1]; break;
    }
  }
  if (mode === 'linear') {
    const w = (duTarget - lo.du) / (hi.du - lo.du);
    return lo.taxa + w * (hi.taxa - lo.taxa);
  }
  // Flat-forward: interpolate on the accumulated capitalization factor (DU/252).
  // (1+r)^(du/252) = (1+r_lo)^(du_lo/252) * [(1+r_hi)^(du_hi/252) / (1+r_lo)^(du_lo/252)]^((du-du_lo)/(du_hi-du_lo))
  const fLo = Math.pow(1 + lo.taxa / 100, lo.du / 252);
  const fHi = Math.pow(1 + hi.taxa / 100, hi.du / 252);
  const w = (duTarget - lo.du) / (hi.du - lo.du);
  const f = fLo * Math.pow(fHi / fLo, w);
  const r = Math.pow(f, 252 / duTarget) - 1;
  return r * 100;
}

function buildNtnbRows(
  refIso: string,
  current: Map<string, number>,
  previous: Map<string, number>,
  nominalCurve: { iso: string; du: number; taxa: number }[],
  mode: InterpMode,
): Row[] {
  return Array.from(current.entries())
    .map(([iso, taxa]) => {
      const taxaAnt = previous.get(iso);
      const variacao_bps =
        taxaAnt != null ? Math.round((taxa - taxaAnt) * 100 * 100) / 100 : null;
      const du = duBetween(refIso, iso);
      const nominal = interpolateNominal(du, nominalCurve, mode);
      const implicita =
        nominal != null
          ? Math.round(((1 + nominal / 100) / (1 + taxa / 100) - 1) * 100 * 100) / 100
          : null;
      return {
        vencimento: `B${iso.slice(2, 4)}`,
        vencimento_data: iso,
        taxa,
        variacao_bps,
        implicita,
      };
    })
    .sort((a, b) => a.vencimento_data.localeCompare(b.vencimento_data));
}

function buildLtnRows(
  currentLtn: Map<string, number>,
  previousLtn: Map<string, number>,
  currentNtnf: Map<string, number>,
  previousNtnf: Map<string, number>,
): Row[] {
  // Merge LTN + NTN-F to extend the pre-fixed nominal curve to longer maturities.
  // NTN-F (semi-annual coupon) takes precedence on duplicate maturities (long end).
  const merged = new Map<string, { taxa: number; prev: number | undefined; prefix: string }>();
  for (const [iso, taxa] of currentLtn) {
    merged.set(iso, { taxa, prev: previousLtn.get(iso), prefix: 'L' });
  }
  for (const [iso, taxa] of currentNtnf) {
    merged.set(iso, { taxa, prev: previousNtnf.get(iso), prefix: 'F' });
  }
  return Array.from(merged.entries())
    .map(([iso, { taxa, prev, prefix }]) => {
      const variacao_bps =
        prev != null ? Math.round((taxa - prev) * 100 * 100) / 100 : null;
      return {
        vencimento: `${prefix}${iso.slice(2, 4)}`,
        vencimento_data: iso,
        taxa,
        variacao_bps,
        implicita: null,
      };
    })
    .sort((a, b) => a.vencimento_data.localeCompare(b.vencimento_data));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  // Auth gate: require a valid Supabase JWT or the shared cron secret.
  const _syncSecret = Deno.env.get('SYNC_SECRET');
  const _provided = req.headers.get('x-sync-secret');
  const _authHeader = req.headers.get('Authorization');
  let _allowed = false;
  if (_syncSecret && _provided && _provided === _syncSecret) {
    _allowed = true;
  } else if (_authHeader?.startsWith('Bearer ')) {
    try {
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
      const _sb = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
      );
      const { data: _claims } = await _sb.auth.getClaims(_authHeader.replace('Bearer ', ''));
      if (_claims?.claims?.sub) _allowed = true;
    } catch (_e) { /* ignore */ }
  }
  if (!_allowed) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const url = new URL(req.url);
    const interpParam = (url.searchParams.get('interp') ?? 'linear').toLowerCase();
    const mode: InterpMode = interpParam === 'flat-forward' ? 'flat-forward' : 'linear';

    const found = await findLatestTwo(20);
    if (!found) {
      return new Response(
        JSON.stringify({ error: 'Nenhum arquivo ANBIMA disponível recentemente' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    const { d0, d1, data0, data1 } = found;
    const refIso = isoDate(d0);
    const nominalCurve = buildNominalCurve(refIso, data0.ltn, data0.ntnf);

    const ntnb = buildNtnbRows(refIso, data0.ntnb, data1.ntnb, nominalCurve, mode);
    const ltn = buildLtnRows(data0.ltn, data1.ltn, data0.ntnf, data1.ntnf);

    return new Response(
      JSON.stringify({
        data_referencia: refIso,
        data_anterior: isoDate(d1),
        interp: mode,
        rows: ntnb,
        ntnb,
        ltn,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
