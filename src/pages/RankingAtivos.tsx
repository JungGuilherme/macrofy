import { useMemo, useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useAuth } from '@/contexts/AuthContext';
import {
  useAssetRanking, useUpsertReturn, useUpsertAsset,
  type RankingAsset, type RankingReturn,
} from '@/hooks/useAssetRanking';
import { Grid3X3, Download, Pencil, Loader2, X, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip,
  Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';

/* ── demo data (used until the SQL setup runs; same values as the seed) ── */

const DEMO_ASSETS: RankingAsset[] = [
  { id: 'ibov', name: 'Ibovespa', short_name: 'IBOV', color: '#2563eb', sort_order: 1, enabled: true },
  { id: 'spx', name: 'S&P 500 (BRL)', short_name: 'S&P500', color: '#7c3aed', sort_order: 2, enabled: true },
  { id: 'ifix', name: 'IFIX', short_name: 'IFIX', color: '#0d9488', sort_order: 3, enabled: true },
  { id: 'imab', name: 'IMA-B', short_name: 'IMA-B', color: '#0891b2', sort_order: 4, enabled: true },
  { id: 'cdi', name: 'CDI', short_name: 'CDI', color: '#65a30d', sort_order: 5, enabled: true },
  { id: 'poup', name: 'Poupança', short_name: 'POUP', color: '#92400e', sort_order: 6, enabled: true },
  { id: 'usd', name: 'Dólar', short_name: 'USD', color: '#059669', sort_order: 7, enabled: true },
  { id: 'gold', name: 'Ouro (BRL)', short_name: 'OURO', color: '#d97706', sort_order: 8, enabled: true },
  { id: 'btc', name: 'Bitcoin (BRL)', short_name: 'BTC', color: '#db2777', sort_order: 9, enabled: true },
  { id: 'ipca', name: 'IPCA', short_name: 'IPCA', color: '#dc2626', sort_order: 10, enabled: true },
];

const DEMO_VALUES: Record<string, number[]> = {
  // 2019, 2020, 2021, 2022, 2023, 2024
  cdi: [5.96, 2.76, 4.42, 12.39, 13.04, 10.88],
  ibov: [31.58, 2.92, -11.93, 4.69, 22.28, -10.36],
  ifix: [35.98, -10.24, -2.28, 2.22, 15.45, -5.89],
  imab: [22.95, 6.41, -1.26, 6.15, 14.3, -2.0],
  usd: [4.02, 28.93, 7.39, -6.5, -7.95, 27.35],
  gold: [22.5, 55.9, 3.5, -0.5, 4.5, 61.6],
  spx: [35.2, 49.9, 38.2, -24.6, 14.4, 57.0],
  btc: [97.0, 422.0, 71.0, -66.3, 134.0, 180.0],
  poup: [4.26, 2.11, 2.99, 7.9, 8.03, 7.07],
  ipca: [4.31, 4.52, 10.06, 5.79, 4.62, 4.83],
};

const DEMO_RETURNS: RankingReturn[] = Object.entries(DEMO_VALUES).flatMap(([assetId, vals]) =>
  vals.map((v, i) => ({
    id: `${assetId}-${i}`,
    asset_id: assetId,
    period: String(2019 + i),
    return_pct: v,
  }))
);

/* ── helpers ── */

function periodSort(a: string, b: string): number {
  if (a === 'YTD') return 1;
  if (b === 'YTD') return -1;
  return a.localeCompare(b);
}

function fmtPct(v: number): string {
  const s = v > 0 ? '+' : '';
  return `${s}${v.toFixed(1).replace('.', ',')}%`;
}

/** Black or white label depending on fill luminance. */
function labelColor(hex: string): string {
  const n = hex.replace('#', '');
  const r = parseInt(n.slice(0, 2), 16), g = parseInt(n.slice(2, 4), 16), b = parseInt(n.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 >= 140 ? '#111111' : '#ffffff';
}

/* ── the quilt ── */

interface QuiltProps {
  assets: RankingAsset[];
  returns: RankingReturn[];
  periods: string[];
  hovered: string | null;
  selected: Set<string>;
  onHover: (id: string | null) => void;
  onToggle: (id: string) => void;
}

function Quilt({ assets, returns, periods, hovered, selected, onHover, onToggle }: QuiltProps) {
  const byPeriod = useMemo(() => {
    const map = new Map<string, { asset: RankingAsset; ret: number }[]>();
    for (const p of periods) {
      const rows = returns
        .filter((r) => r.period === p)
        .map((r) => ({ asset: assets.find((a) => a.id === r.asset_id)!, ret: Number(r.return_pct) }))
        .filter((r) => r.asset)
        .sort((a, b) => b.ret - a.ret);
      map.set(p, rows);
    }
    return map;
  }, [assets, returns, periods]);

  const anyFocus = hovered !== null || selected.size > 0;
  const isFocused = (id: string) => hovered === id || selected.has(id);

  return (
    <div className="overflow-x-auto pb-1">
      <div className="flex gap-1.5 min-w-fit">
        {periods.map((p) => (
          <div key={p} className="flex flex-col gap-0.5 w-[92px] flex-shrink-0">
            <div className="text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground py-1">
              {p}
            </div>
            {(byPeriod.get(p) ?? []).map(({ asset, ret }) => {
              const focused = isFocused(asset.id);
              const faded = anyFocus && !focused;
              return (
                <button
                  key={asset.id}
                  onMouseEnter={() => onHover(asset.id)}
                  onMouseLeave={() => onHover(null)}
                  onClick={() => onToggle(asset.id)}
                  className={cn(
                    'rounded px-1.5 py-1.5 text-center transition-all duration-150 cursor-pointer',
                    faded && 'opacity-20',
                    selected.has(asset.id) && 'ring-2 ring-offset-1 ring-foreground/60'
                  )}
                  style={{ backgroundColor: asset.color, color: labelColor(asset.color) }}
                  title={`${asset.name} — ${p}: ${fmtPct(ret)}`}
                >
                  <div className="text-[11px] font-bold leading-tight">{asset.short_name}</div>
                  <div className="text-[11px] leading-tight" style={{ fontFamily: "'Roboto Mono', monospace" }}>
                    {fmtPct(ret)}
                  </div>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── comparison chart (rebased 100) ── */

function CompareChart({ assets, returns, periods, selected }: {
  assets: RankingAsset[]; returns: RankingReturn[]; periods: string[]; selected: Set<string>;
}) {
  const picked = assets.filter((a) => selected.has(a.id));

  const data = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const a of picked) acc[a.id] = 100;
    const rows: any[] = [{ period: 'Base', ...Object.fromEntries(picked.map((a) => [a.short_name, 100])) }];
    for (const p of periods) {
      const row: any = { period: p };
      for (const a of picked) {
        const r = returns.find((x) => x.asset_id === a.id && x.period === p);
        if (r) acc[a.id] *= 1 + Number(r.return_pct) / 100;
        row[a.short_name] = Number(acc[a.id].toFixed(1));
      }
      rows.push(row);
    }
    return rows;
  }, [picked, returns, periods]);

  if (picked.length < 2) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        Clique em dois ou mais ativos na tabela para comparar trajetórias.
      </p>
    );
  }

  return (
    <div className="h-[340px] w-full">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="period" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
          <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" width={48} />
          <ReferenceLine y={100} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" />
          <ChartTooltip
            contentStyle={{
              background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))',
              borderRadius: 8, fontSize: 12,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {picked.map((a) => (
            <Line
              key={a.id}
              type="monotone"
              dataKey={a.short_name}
              stroke={a.color}
              strokeWidth={2}
              dot={{ r: 3, fill: a.color }}
              activeDot={{ r: 5 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      <p className="text-[11px] text-muted-foreground text-center -mt-1">
        Retorno acumulado — base 100 no início da janela
      </p>
    </div>
  );
}

/* ── admin editor ── */

function AdminEditor({ assets, returns, periods }: {
  assets: RankingAsset[]; returns: RankingReturn[]; periods: string[];
}) {
  const upsertReturn = useUpsertReturn();
  const upsertAsset = useUpsertAsset();
  const [newPeriod, setNewPeriod] = useState('');
  const [newAsset, setNewAsset] = useState({ name: '', short_name: '', color: '#2563eb' });
  const allPeriods = useMemo(() => {
    const set = new Set(periods);
    if (newPeriod.trim()) set.add(newPeriod.trim());
    return Array.from(set).sort(periodSort);
  }, [periods, newPeriod]);

  const valueOf = (assetId: string, period: string) =>
    returns.find((r) => r.asset_id === assetId && r.period === period)?.return_pct;

  return (
    <div className="space-y-6">
      {/* Returns grid */}
      <div className="overflow-x-auto">
        <table className="text-xs w-full">
          <thead>
            <tr>
              <th className="text-left p-1.5 font-medium text-muted-foreground">Ativo</th>
              {allPeriods.map((p) => (
                <th key={p} className="p-1.5 font-medium text-muted-foreground min-w-[76px]">{p}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {assets.map((a) => (
              <tr key={a.id} className="border-t border-border">
                <td className="p-1.5 whitespace-nowrap">
                  <span className="inline-block w-2.5 h-2.5 rounded-sm mr-1.5" style={{ background: a.color }} />
                  {a.short_name}
                </td>
                {allPeriods.map((p) => (
                  <td key={p} className="p-1">
                    <Input
                      type="number"
                      step="0.01"
                      className="h-7 text-xs text-right px-1.5"
                      defaultValue={valueOf(a.id, p) ?? ''}
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        if (v === '') return;
                        const num = parseFloat(v);
                        if (isNaN(num)) return;
                        if (num !== valueOf(a.id, p)) {
                          upsertReturn.mutate({ asset_id: a.id, period: p, return_pct: num });
                        }
                      }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* New period */}
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Novo período (ex: 2025 ou YTD)</p>
          <Input
            value={newPeriod}
            onChange={(e) => setNewPeriod(e.target.value)}
            placeholder="2025"
            className="h-8 text-xs"
          />
          <p className="text-[11px] text-muted-foreground">
            A coluna aparece na grade acima — preencha os valores e eles são salvos ao sair do campo.
          </p>
        </div>

        {/* New asset */}
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Novo ativo</p>
          <div className="flex gap-1.5">
            <Input
              value={newAsset.name}
              onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })}
              placeholder="Nome (ex: Euro)"
              className="h-8 text-xs"
            />
            <Input
              value={newAsset.short_name}
              onChange={(e) => setNewAsset({ ...newAsset, short_name: e.target.value })}
              placeholder="Sigla"
              className="h-8 text-xs w-24"
            />
            <input
              type="color"
              value={newAsset.color}
              onChange={(e) => setNewAsset({ ...newAsset, color: e.target.value })}
              className="h-8 w-10 rounded border border-border bg-transparent cursor-pointer"
              title="Cor do ativo"
            />
            <Button
              size="sm"
              className="h-8"
              disabled={!newAsset.name.trim() || !newAsset.short_name.trim() || upsertAsset.isPending}
              onClick={() => {
                upsertAsset.mutate(
                  { ...newAsset, sort_order: assets.length + 1, enabled: true },
                  { onSuccess: () => setNewAsset({ name: '', short_name: '', color: '#2563eb' }) }
                );
              }}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── page ── */

export default function RankingAtivos() {
  const { role } = useAuth();
  const isAdmin = role === 'admin';
  const { data, isLoading } = useAssetRanking();

  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);
  const [demo, setDemo] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  const usingDemo = demo && data?.setupNeeded;
  const assets = usingDemo ? DEMO_ASSETS : data?.assets ?? [];
  const returns = usingDemo ? DEMO_RETURNS : data?.returns ?? [];
  const periods = useMemo(
    () => Array.from(new Set(returns.map((r) => r.period))).sort(periodSort),
    [returns]
  );

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const exportPng = async () => {
    if (!exportRef.current) return;
    setExporting(true);
    try {
      const dataUrl = await toPng(exportRef.current, {
        pixelRatio: 2,
        backgroundColor: '#ffffff',
      });
      const link = document.createElement('a');
      const now = new Date();
      link.download = `ranking-ativos-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}.png`;
      link.href = dataUrl;
      link.click();
    } finally {
      setExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (data?.setupNeeded && !demo) {
    return (
      <div className="space-y-4">
        <PageHeader title="Ranking de Ativos" subtitle="Tabela periódica de retornos" />
        <Card>
          <CardContent className="py-12 text-center space-y-3 max-w-lg mx-auto">
            <Grid3X3 className="h-10 w-10 text-muted-foreground/40 mx-auto" />
            <p className="text-sm text-foreground font-medium">Banco ainda não configurado</p>
            <p className="text-sm text-muted-foreground">
              Execute o SQL em <code className="text-xs bg-muted px-1 py-0.5 rounded">supabase/manual/asset-ranking.sql</code>{' '}
              (cole no chat do Lovable pedindo para rodar no banco). Depois recarregue esta página.
            </p>
            <Button variant="outline" size="sm" onClick={() => setDemo(true)}>
              Ver demonstração com dados de exemplo
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-up">
      <div className="flex items-start justify-between flex-wrap gap-2">
        <PageHeader
          title="Ranking de Ativos"
          subtitle="Retorno anual por classe — passe o mouse para acompanhar um ativo, clique para comparar"
        />
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <Button variant="outline" size="sm" onClick={() => setSelected(new Set())}>
              <X className="h-3.5 w-3.5 mr-1.5" />
              Limpar seleção
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={exportPng} disabled={exporting}>
            {exporting
              ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              : <Download className="h-3.5 w-3.5 mr-1.5" />}
            Exportar PNG
          </Button>
          {isAdmin && !usingDemo && (
            <Sheet>
              <SheetTrigger asChild>
                <Button size="sm">
                  <Pencil className="h-3.5 w-3.5 mr-1.5" />
                  Editar dados
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
                <SheetHeader className="mb-4">
                  <SheetTitle>Editar retornos</SheetTitle>
                </SheetHeader>
                <AdminEditor assets={assets} returns={returns} periods={periods} />
              </SheetContent>
            </Sheet>
          )}
        </div>
      </div>

      {/* Exportable block: title + quilt */}
      <Card>
        <CardContent className="p-4">
          <div ref={exportRef} className="p-2 bg-card rounded-lg">
            <div className="flex items-baseline justify-between mb-3 px-1">
              <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">
                Ranking de Ativos — retorno por ano
              </h2>
              <span className="text-[10px] text-muted-foreground" style={{ fontFamily: "'Roboto Mono', monospace" }}>
                MACROFY
              </span>
            </div>
            <Quilt
              assets={assets}
              returns={returns}
              periods={periods}
              hovered={hovered}
              selected={selected}
              onHover={setHovered}
              onToggle={toggle}
            />
          </div>
        </CardContent>
      </Card>

      {/* Comparison chart */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold text-foreground mb-2">Comparar trajetórias</h3>
          <CompareChart assets={assets} returns={returns} periods={periods} selected={selected} />
        </CardContent>
      </Card>
    </div>
  );
}
