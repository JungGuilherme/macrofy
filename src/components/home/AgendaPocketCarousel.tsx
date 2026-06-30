import { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  useAgendaEconomica,
  useAgendaResultados,
  useAgendaDividendos,
  getLocalDateString,
  parseLocalDate,
  isTimePast,
  formatToBRDate,
  AgendaEconomica,
  AgendaResultado,
  AgendaDividendo,
} from '@/hooks/useAgendaPocket';
import useEmblaCarousel from 'embla-carousel-react';

// Country code to emoji map
const COUNTRY_FLAGS: Record<string, string> = {
  BR: '🇧🇷',
  US: '🇺🇸',
  EU: '🇪🇺',
  CN: '🇨🇳',
  JP: '🇯🇵',
  GB: '🇬🇧',
  DE: '🇩🇪',
};

type UnifiedItem = {
  id: string;
  type: 'economica' | 'resultado' | 'dividendo';
  date: string;
  time: string | null;
  country: string;
  title: string;
  ticker?: string;
  dividendType?: string;
  dividendYield?: number | null;
  exDate?: string | null;
};

function formatDateHeader(dateStr: string, todayStr: string): { dayName: string; dateFormatted: string; isToday: boolean } {
  const date = parseLocalDate(dateStr);
  const isToday = dateStr === todayStr;
  
  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const dayName = dayNames[date.getDay()];
  
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const dateFormatted = `${day}/${month}`;
  
  return { dayName, dateFormatted, isToday };
}

function formatTime(time: string | null): string {
  if (!time) return '';
  // Handle HH:MM:SS format from database
  if (time.includes(':')) {
    return time.substring(0, 5);
  }
  return time;
}

function AgendaDayCard({ 
  dateStr, 
  items, 
  todayStr 
}: { 
  dateStr: string; 
  items: UnifiedItem[]; 
  todayStr: string;
}) {
  const { dayName, dateFormatted, isToday } = formatDateHeader(dateStr, todayStr);
  const isPastDay = dateStr < todayStr;
  
  // Sort items: with time first (by time), then without time
  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      if (a.time && b.time) return a.time.localeCompare(b.time);
      if (a.time && !b.time) return -1;
      if (!a.time && b.time) return 1;
      return 0;
    });
  }, [items]);
  
  return (
    <div 
      className={cn(
        "flex-shrink-0 w-full rounded-lg border bg-card p-4 transition-all",
        isToday && "ring-2 ring-primary shadow-lg",
        isPastDay && "opacity-70"
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3 pb-2 border-b">
        <span className="text-sm font-semibold text-foreground">
          {dayName} • {dateFormatted}
        </span>
        {isToday && (
          <Badge variant="default" className="text-xs bg-primary">
            Hoje
          </Badge>
        )}
      </div>
      
      {/* Items */}
      <div className="space-y-2 max-h-[280px] overflow-y-auto">
        {sortedItems.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum evento
          </p>
        ) : (
          sortedItems.map((item) => {
            const isPast = isTimePast(item.time, dateStr);
            const timeDisplay = formatTime(item.time);
            
            return (
              <div 
                key={`${item.type}-${item.id}`}
                className={cn(
                  "flex items-start justify-between gap-2 text-sm py-1.5 px-2 rounded-md",
                  item.type === 'economica' && "bg-slate-100 dark:bg-slate-800",
                  item.type === 'resultado' && "bg-emerald-50 dark:bg-emerald-900/30",
                  item.type === 'dividendo' && "bg-amber-50 dark:bg-amber-900/30",
                  isPast && "opacity-50"
                )}
              >
                {/* Content */}
                <div className="flex-1 min-w-0">
                  {item.type === 'economica' && (
                    <span className="text-foreground">
                      {item.country && COUNTRY_FLAGS[item.country] && (
                        <span className="mr-1">{COUNTRY_FLAGS[item.country]}</span>
                      )}
                      {item.title}
                    </span>
                  )}
                  
                  {item.type === 'resultado' && (
                    <span className="text-foreground">
                      <span className="font-medium">Resultado</span>
                      <span className="mx-1">•</span>
                      {item.title}
                      {item.ticker && <span className="text-muted-foreground ml-1">({item.ticker})</span>}
                    </span>
                  )}
                  
                  {item.type === 'dividendo' && (
                    <div className="text-foreground">
                      <span>
                        <span className="font-medium">Dividendo</span>
                        <span className="mx-1">•</span>
                        {item.title}
                        {item.ticker && <span className="text-muted-foreground ml-1">({item.ticker})</span>}
                      </span>
                      {/* Additional info for dividends */}
                      <div className="flex flex-wrap gap-x-2 text-xs text-muted-foreground mt-0.5">
                        {item.exDate && (
                          <span>Data ex: {formatToBRDate(item.exDate)}</span>
                        )}
                        {item.dividendYield && item.dividendType === 'Dividendo' && (
                          <span>DY: {item.dividendYield.toFixed(2)}%</span>
                        )}
                        {item.dividendYield && item.dividendType === 'JCP' && (
                          <span>JCP: {item.dividendYield.toFixed(2)}%</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Time on the right */}
                {timeDisplay && (
                  <span className="font-mono text-xs text-muted-foreground flex-shrink-0">
                    {timeDisplay}
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export function AgendaPocketCarousel() {
  const todayStr = getLocalDateString();
  
  // Generate 15 days: 7 before + today + 7 after
  const dates = useMemo(() => {
    const result: string[] = [];
    const today = new Date();
    
    for (let i = -7; i <= 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      result.push(getLocalDateString(date));
    }
    
    return result;
  }, []);
  
  const startDate = dates[0];
  const endDate = dates[dates.length - 1];
  
  // Fetch all data
  const { data: economica = [], isLoading: loadingEconomica } = useAgendaEconomica(startDate, endDate);
  const { data: resultados = [], isLoading: loadingResultados } = useAgendaResultados(startDate, endDate);
  const { data: dividendos = [], isLoading: loadingDividendos } = useAgendaDividendos(startDate, endDate);
  
  const isLoading = loadingEconomica || loadingResultados || loadingDividendos;
  
  // Unify all items
  const unifiedItems = useMemo(() => {
    const items: UnifiedItem[] = [];
    
    economica.forEach((e) => {
      items.push({
        id: e.id,
        type: 'economica',
        date: e.event_date,
        time: e.event_time,
        country: e.country,
        title: e.title,
      });
    });
    
    resultados.forEach((r) => {
      items.push({
        id: r.id,
        type: 'resultado',
        date: r.event_date,
        time: r.event_time,
        country: r.country,
        title: r.company,
        ticker: r.ticker,
      });
    });
    
    dividendos.forEach((d) => {
      items.push({
        id: d.id,
        type: 'dividendo',
        date: d.event_date,
        time: null,
        country: d.country,
        title: d.company,
        ticker: d.ticker,
        dividendType: d.dividend_type,
        dividendYield: d.dividend_yield,
        exDate: d.ex_date,
      });
    });
    
    return items;
  }, [economica, resultados, dividendos]);
  
  // Group items by date
  const itemsByDate = useMemo(() => {
    const map: Record<string, UnifiedItem[]> = {};
    dates.forEach(d => { map[d] = []; });
    
    unifiedItems.forEach(item => {
      if (map[item.date]) {
        map[item.date].push(item);
      }
    });
    
    return map;
  }, [unifiedItems, dates]);
  
  // Find today's index (should be 7)
  const todayIndex = dates.findIndex(d => d === todayStr);
  
  // Embla carousel
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'center',
    startIndex: todayIndex >= 0 ? todayIndex : 7,
    containScroll: 'trimSnaps',
  });
  
  const [, setSelectedIndex] = useState(todayIndex >= 0 ? todayIndex : 7);
  
  // Update selected index on scroll
  useEffect(() => {
    if (!emblaApi) return;
    
    const onSelect = () => {
      setSelectedIndex(emblaApi.selectedScrollSnap());
    };
    
    emblaApi.on('select', onSelect);
    return () => { emblaApi.off('select', onSelect); };
  }, [emblaApi]);
  
  const scrollPrev = () => emblaApi?.scrollPrev();
  const scrollNext = () => emblaApi?.scrollNext();
  
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-muted rounded animate-pulse" />
        ))}
      </div>
    );
  }
  
  return (
    <div className="relative">
      {/* Navigation Buttons centered on sides */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 z-10 -ml-2">
        <Button 
          variant="outline" 
          size="icon" 
          onClick={scrollPrev}
          className="h-8 w-8 rounded-full shadow-md bg-card"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="absolute right-0 top-1/2 -translate-y-1/2 z-10 -mr-2">
        <Button 
          variant="outline" 
          size="icon" 
          onClick={scrollNext}
          className="h-8 w-8 rounded-full shadow-md bg-card"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Carousel */}
      <div className="overflow-hidden px-6" ref={emblaRef}>
        <div className="flex gap-4">
          {dates.map((dateStr) => (
            <AgendaDayCard
              key={dateStr}
              dateStr={dateStr}
              items={itemsByDate[dateStr] || []}
              todayStr={todayStr}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
