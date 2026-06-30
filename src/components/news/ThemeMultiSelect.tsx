import { Check, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { NEWS_THEMES, type NewsTheme, themeLabel, themeChipClass } from '@/lib/newsThemes';
import { cn } from '@/lib/utils';

interface ThemeMultiSelectProps {
  value: NewsTheme[];
  onChange: (themes: NewsTheme[]) => void;
  placeholder?: string;
  className?: string;
}

export function ThemeMultiSelect({ value, onChange, placeholder = 'Selecione temas…', className }: ThemeMultiSelectProps) {
  const toggle = (t: NewsTheme) => {
    if (value.includes(t)) onChange(value.filter((v) => v !== t));
    else onChange([...value, t]);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn('h-8 justify-between gap-1.5 text-xs font-normal w-full', className)}
        >
          <span className="flex flex-wrap items-center gap-1 overflow-hidden">
            {value.length === 0 ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : (
              value.map((t) => (
                <span
                  key={t}
                  className={cn('rounded px-1.5 py-0.5 text-[10px] font-medium border', themeChipClass(t))}
                >
                  {themeLabel(t)}
                </span>
              ))
            )}
          </span>
          <ChevronDown className="h-3.5 w-3.5 opacity-60 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-1" align="start">
        <div className="max-h-72 overflow-y-auto">
          {NEWS_THEMES.map((t) => {
            const selected = value.includes(t.value);
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => toggle(t.value)}
                className="flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-xs hover:bg-accent"
              >
                <span className="flex items-center gap-2">
                  <span className={cn('inline-block h-2 w-2 rounded-full', themeChipClass(t.value).split(' ')[0])} />
                  {t.label}
                </span>
                {selected && <Check className="h-3.5 w-3.5 text-primary" />}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
