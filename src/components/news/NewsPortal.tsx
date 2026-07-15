import { useState } from 'react';
import { Star, ExternalLink, Pencil, Trash2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { themeChipClass, themeLabel } from '@/lib/newsThemes';
import { Button } from '@/components/ui/button';
import type { AggregatedNewsRow, RssFeed } from '@/hooks/useRssFeeds';

interface NewsPortalProps {
  rows: AggregatedNewsRow[];
  feeds: RssFeed[];
  isAdmin?: boolean;
  onToggleFeatured?: (row: AggregatedNewsRow) => void;
  onEditManual?: (row: AggregatedNewsRow) => void;
  onDeleteManual?: (row: AggregatedNewsRow) => void;
}

/** Google News feeds ship HTML/anchor-URLs as description — strip and drop useless ones. */
function cleanSummary(s?: string): string | undefined {
  if (!s) return undefined;
  const text = s.replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim();
  if (!text || /^https?:\/\//i.test(text) || text.includes('news.google.com')) return undefined;
  return text;
}

function timeAgo(d: Date): string {
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `há ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'ontem';
  if (days < 7) return `há ${days} dias`;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function AdminActions({
  row, onToggleFeatured, onEditManual, onDeleteManual, className,
}: {
  row: AggregatedNewsRow;
  onToggleFeatured?: (row: AggregatedNewsRow) => void;
  onEditManual?: (row: AggregatedNewsRow) => void;
  onDeleteManual?: (row: AggregatedNewsRow) => void;
  className?: string;
}) {
  if (row.origin !== 'manual') return null;
  return (
    <div className={cn('flex items-center gap-0.5', className)}>
      <Button
        variant="ghost" size="icon" className="h-6 w-6"
        onClick={(e) => { e.preventDefault(); onToggleFeatured?.(row); }}
        title={row.isFeatured ? 'Remover destaque' : 'Marcar como destaque'}
      >
        <Star className={cn('h-3 w-3', row.isFeatured && 'fill-amber-500 text-amber-500')} />
      </Button>
      <Button
        variant="ghost" size="icon" className="h-6 w-6"
        onClick={(e) => { e.preventDefault(); onEditManual?.(row); }} title="Editar"
      >
        <Pencil className="h-3 w-3" />
      </Button>
      <Button
        variant="ghost" size="icon" className="h-6 w-6 text-destructive/70 hover:text-destructive"
        onClick={(e) => { e.preventDefault(); onDeleteManual?.(row); }} title="Excluir"
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
}

function MetaLine({ row }: { row: AggregatedNewsRow }) {
  return (
    <div className="flex items-center gap-2 flex-wrap text-[11px] text-muted-foreground">
      <span className="font-medium uppercase tracking-wide">{row.source}</span>
      <span>·</span>
      <span className="flex items-center gap-1">
        <Clock className="h-3 w-3" />
        {timeAgo(row.publishedAt)}
      </span>
      {row.themes.slice(0, 2).map((th) => (
        <span
          key={th}
          className={cn(
            'rounded px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider border',
            themeChipClass(th),
          )}
        >
          {themeLabel(th)}
        </span>
      ))}
    </div>
  );
}

/** Big lead card for the top story. */
function HeroCard({ row, adminProps }: { row: AggregatedNewsRow; adminProps: Omit<NewsPortalProps, 'rows' | 'feeds'> }) {
  return (
    <a
      href={row.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative flex flex-col justify-end rounded-xl border border-border overflow-hidden bg-card min-h-[260px]"
    >
      {row.imageUrl ? (
        <>
          <img
            src={row.imageUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/10" />
        </>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/15 to-primary/5" />
      )}
      <div className="relative p-5 space-y-2">
        {row.isFeatured && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 text-black text-[10px] font-bold uppercase tracking-wider px-2 py-0.5">
            <Star className="h-3 w-3 fill-black" /> Destaque
          </span>
        )}
        <h2
          className={cn(
            'text-xl md:text-2xl font-bold leading-snug group-hover:underline',
            row.imageUrl ? 'text-white' : 'text-foreground',
          )}
          style={{ fontFamily: "'Libre Baskerville', Georgia, serif" }}
        >
          {row.title}
        </h2>
        {cleanSummary(row.summary) && (
          <p className={cn('text-sm line-clamp-2', row.imageUrl ? 'text-white/80' : 'text-muted-foreground')}>
            {cleanSummary(row.summary)}
          </p>
        )}
        <div className={cn('flex items-center gap-2 text-[11px]', row.imageUrl ? 'text-white/70' : 'text-muted-foreground')}>
          <span className="font-medium uppercase tracking-wide">{row.source}</span>
          <span>·</span>
          <span>{timeAgo(row.publishedAt)}</span>
        </div>
      </div>
      <AdminActions
        row={row}
        {...adminProps}
        className="absolute top-2 right-2 bg-background/80 backdrop-blur rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
      />
    </a>
  );
}

/** Compact side story for the hero block. */
function SideStory({ row, adminProps }: { row: AggregatedNewsRow; adminProps: Omit<NewsPortalProps, 'rows' | 'feeds'> }) {
  return (
    <a
      href={row.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex gap-3 items-start py-2.5 first:pt-0 last:pb-0"
    >
      {row.imageUrl && (
        <img
          src={row.imageUrl}
          alt=""
          className="w-16 h-16 rounded-lg object-cover flex-shrink-0 border border-border"
          loading="lazy"
        />
      )}
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-semibold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
          {row.isFeatured && <Star className="inline h-3 w-3 mb-0.5 mr-1 fill-amber-500 text-amber-500" />}
          {row.title}
        </h3>
        <div className="flex items-center gap-1.5 mt-1 text-[11px] text-muted-foreground">
          <span className="font-medium uppercase tracking-wide truncate">{row.source}</span>
          <span>·</span>
          <span className="shrink-0">{timeAgo(row.publishedAt)}</span>
        </div>
      </div>
      <AdminActions row={row} {...adminProps} className="opacity-0 group-hover:opacity-100 transition-opacity" />
    </a>
  );
}

/** Regular feed card. */
function FeedCard({ row, adminProps }: { row: AggregatedNewsRow; adminProps: Omit<NewsPortalProps, 'rows' | 'feeds'> }) {
  return (
    <a
      href={row.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'group flex gap-4 items-start px-4 py-4 transition-colors hover:bg-accent/40',
        row.isFeatured && 'bg-amber-500/5',
      )}
    >
      {row.imageUrl && (
        <img
          src={row.imageUrl}
          alt=""
          className="w-24 h-20 md:w-28 md:h-24 rounded-lg object-cover flex-shrink-0 border border-border hidden sm:block"
          loading="lazy"
        />
      )}
      <div className="min-w-0 flex-1 space-y-1.5">
        <h3 className="text-[15px] font-semibold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
          {row.isFeatured && <Star className="inline h-3.5 w-3.5 mb-0.5 mr-1 fill-amber-500 text-amber-500" />}
          {row.title}
        </h3>
        {cleanSummary(row.summary) && (
          <p className="text-[13px] text-muted-foreground line-clamp-2 leading-relaxed">
            {cleanSummary(row.summary)}
          </p>
        )}
        <MetaLine row={row} />
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
        <AdminActions row={row} {...adminProps} className="opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </a>
  );
}

/** Right rail: Investing's official "Mais Lidas" ranking. */
function MaisLidasRail({ feeds }: { feeds: RssFeed[] }) {
  const feed = feeds.find(
    (f) => f.is_active !== false && (/mais lidas/i.test(f.name) || f.theme === 'Mais Lidas')
  );
  const items = (feed?.items ?? []).slice(0, 8);
  if (items.length === 0) return null;

  return (
    <div className="rounded-xl border bg-card p-4">
      <h3 className="text-sm font-semibold text-foreground mb-3">Mais Lidas</h3>
      <ol className="space-y-2.5">
        {items.map((item, i) => (
          <li key={item.guid}>
            <a
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-start gap-2.5"
            >
              <span
                className="text-lg font-bold text-muted-foreground/40 leading-none w-5 text-right flex-shrink-0"
                style={{ fontFamily: "'Roboto Mono', monospace" }}
              >
                {i + 1}
              </span>
              <span className="text-[13px] font-medium text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                {item.title}
              </span>
            </a>
          </li>
        ))}
      </ol>
    </div>
  );
}

const PAGE_SIZE = 20;

export function NewsPortal({ rows, feeds, ...adminProps }: NewsPortalProps) {
  const [visible, setVisible] = useState(PAGE_SIZE);

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card py-16 text-center">
        <p className="text-sm text-muted-foreground">Nenhuma notícia no momento — os feeds atualizam a cada 30 minutos.</p>
      </div>
    );
  }

  // Hero block: featured first, then whatever has an image, then most recent
  const featured = rows.filter((r) => r.isFeatured);
  const withImage = rows.filter((r) => !r.isFeatured && r.imageUrl);
  const heroPool = [...featured, ...withImage, ...rows.filter((r) => !r.isFeatured && !r.imageUrl)];
  const lead = heroPool[0];
  const sideStories = heroPool.slice(1, 5);
  const heroIds = new Set([lead, ...sideStories].map((r) => r.id));

  const feedRows = rows.filter((r) => !heroIds.has(r.id));

  return (
    <div className="space-y-4">
      {/* Hero */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <HeroCard row={lead} adminProps={adminProps} />
        </div>
        <div className="rounded-xl border bg-card p-4 divide-y divide-border">
          {sideStories.map((row) => (
            <SideStory key={row.id} row={row} adminProps={adminProps} />
          ))}
        </div>
      </div>

      {/* Feed + rail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        <div className="lg:col-span-2">
          <div className="rounded-xl border bg-card divide-y divide-border overflow-hidden">
            {feedRows.slice(0, visible).map((row) => (
              <FeedCard key={row.id} row={row} adminProps={adminProps} />
            ))}
          </div>
          {feedRows.length > visible && (
            <div className="flex justify-center pt-4">
              <Button variant="outline" size="sm" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
                Carregar mais ({feedRows.length - visible} restantes)
              </Button>
            </div>
          )}
        </div>
        <div className="space-y-4 lg:sticky lg:top-32">
          <MaisLidasRail feeds={feeds} />
        </div>
      </div>
    </div>
  );
}
