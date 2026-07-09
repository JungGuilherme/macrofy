import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw, Database, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const SYNC_FUNCTIONS = [
  { name: 'sync-macro-bcb', label: 'Banco Central (IPCA, Selic, IBC-Br, CAGED…)' },
  { name: 'sync-macro-fred', label: 'FRED — dados dos EUA (CPI, PCE, payroll…)' },
  { name: 'sync-macro-global', label: 'Snapshot global (tabela de países)' },
] as const;

// New BR series seeded on demand; ignored if already present
const SEED_SERIES = [
  {
    country: 'BR', category: 'Trabalho', indicator: 'CAGED (saldo)', source: 'BCB',
    series_code: '28763', unit: 'empregos', frequency: 'monthly', default_mode: 'level',
    polarity: 'positive', sort_order: 32, enabled: true,
    notes: 'Saldo de empregos celetistas — CAGED',
  },
  {
    country: 'BR', category: 'Fiscal/Externo', indicator: 'Câmbio USD/BRL', source: 'BCB',
    series_code: '1', unit: 'USD/BRL', frequency: 'monthly', default_mode: 'level',
    polarity: 'negative', sort_order: 41, enabled: true,
    notes: 'Taxa de câmbio livre — Dólar (venda) — fim de período',
  },
];

type StepStatus = 'pending' | 'running' | 'ok' | 'error';

interface StepState {
  label: string;
  status: StepStatus;
  detail?: string;
}

export function MacroSyncSection() {
  const [running, setRunning] = useState(false);
  const [steps, setSteps] = useState<StepState[]>([]);

  const updateStep = (idx: number, patch: Partial<StepState>) => {
    setSteps((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };

  const runSync = async () => {
    setRunning(true);
    const initial: StepState[] = [
      { label: 'Registrar séries novas (CAGED, câmbio)', status: 'running' },
      ...SYNC_FUNCTIONS.map((f) => ({ label: f.label, status: 'pending' as StepStatus })),
    ];
    setSteps(initial);

    // Step 0: seed metadata (idempotent — duplicates are ignored)
    try {
      const { error } = await (supabase as any)
        .from('macro_series_metadata')
        .upsert(SEED_SERIES, { onConflict: 'country,series_code', ignoreDuplicates: true });
      if (error) throw error;
      updateStep(0, { status: 'ok' });
    } catch (err: any) {
      updateStep(0, { status: 'error', detail: err.message });
    }

    // Steps 1..n: call each edge function sequentially
    for (let i = 0; i < SYNC_FUNCTIONS.length; i++) {
      const stepIdx = i + 1;
      updateStep(stepIdx, { status: 'running' });
      try {
        const { data, error } = await supabase.functions.invoke(SYNC_FUNCTIONS[i].name, { body: {} });
        if (error) throw error;
        const count = Array.isArray(data?.synced) ? data.synced.length : undefined;
        updateStep(stepIdx, {
          status: 'ok',
          detail: count !== undefined ? `${count} séries processadas` : undefined,
        });
      } catch (err: any) {
        updateStep(stepIdx, { status: 'error', detail: err.message || 'Falha na chamada' });
      }
    }

    setRunning(false);
  };

  return (
    <div className="bg-card rounded-xl border p-4 sm:p-6">
      <div className="flex items-center gap-3 mb-1">
        <Database className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">Dados Macro</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Atualiza os indicadores do Banco Central, FRED e World Bank. A sincronização
        automática roda todo dia às 7h (Brasília) via GitHub Actions.
      </p>

      <Button onClick={runSync} disabled={running}>
        {running ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <RefreshCw className="h-4 w-4 mr-2" />
        )}
        {running ? 'Sincronizando…' : 'Sincronizar agora'}
      </Button>

      {steps.length > 0 && (
        <div className="mt-4 space-y-2">
          {steps.map((step, i) => (
            <div key={i} className="flex items-start gap-2 text-sm">
              {step.status === 'pending' && <div className="h-4 w-4 mt-0.5 rounded-full border border-muted-foreground/30 flex-shrink-0" />}
              {step.status === 'running' && <Loader2 className="h-4 w-4 mt-0.5 animate-spin text-primary flex-shrink-0" />}
              {step.status === 'ok' && <CheckCircle2 className="h-4 w-4 mt-0.5 text-success flex-shrink-0" />}
              {step.status === 'error' && <XCircle className="h-4 w-4 mt-0.5 text-destructive flex-shrink-0" />}
              <div className="min-w-0">
                <span className={cn(step.status === 'pending' && 'text-muted-foreground')}>{step.label}</span>
                {step.detail && (
                  <span className={cn(
                    'block text-xs',
                    step.status === 'error' ? 'text-destructive' : 'text-muted-foreground'
                  )}>
                    {step.detail}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
