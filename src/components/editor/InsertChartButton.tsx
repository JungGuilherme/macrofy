import { useMemo, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useMacroMetadata } from '@/hooks/useMacroData';
import { BarChart3 } from 'lucide-react';
import type { MacroChartMode } from '@/components/reports/MacroEmbedChart';

const MODES: { value: MacroChartMode; label: string }[] = [
  { value: 'level', label: 'Nível' },
  { value: 'mom', label: 'Variação mensal (M/M)' },
  { value: 'yoy', label: 'Variação 12 meses (A/A)' },
];

export function InsertChartButton({ editor }: { editor: Editor }) {
  const { data: metadata = [] } = useMacroMetadata();
  const [open, setOpen] = useState(false);
  const [country, setCountry] = useState('BR');
  const [series, setSeries] = useState<string>('');
  const [mode, setMode] = useState<MacroChartMode>('level');

  const countries = useMemo(
    () => Array.from(new Set(metadata.map((m) => m.country))).sort(),
    [metadata]
  );
  const seriesOptions = useMemo(
    () => metadata.filter((m) => m.country === country).sort((a, b) => a.sort_order - b.sort_order),
    [metadata, country]
  );

  const insert = () => {
    if (!series) return;
    const meta = seriesOptions.find((s) => s.series_code === series);
    editor.chain().focus().insertContent({
      type: 'macroChart',
      attrs: { country, series, mode, label: meta?.indicator ?? series },
    }).run();
    setOpen(false);
    setSeries('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" size="sm" title="Inserir gráfico">
          <BarChart3 className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 space-y-3" align="start">
        <p className="text-xs font-semibold text-foreground">Inserir gráfico macro</p>

        <div className="space-y-1">
          <Label className="text-xs">País</Label>
          <Select value={country} onValueChange={(v) => { setCountry(v); setSeries(''); }}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {countries.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Indicador</Label>
          <Select value={series} onValueChange={setSeries}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione…" /></SelectTrigger>
            <SelectContent>
              {seriesOptions.map((s) => (
                <SelectItem key={s.series_code} value={s.series_code}>{s.indicator}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Modo</Label>
          <Select value={mode} onValueChange={(v) => setMode(v as MacroChartMode)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MODES.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <Button size="sm" className="w-full h-8" disabled={!series} onClick={insert}>
          Inserir
        </Button>
      </PopoverContent>
    </Popover>
  );
}
