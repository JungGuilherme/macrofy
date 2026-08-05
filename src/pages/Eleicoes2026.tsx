import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { AddPollDialog } from '@/components/forms/AddPollDialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useElectionPolls, useDeletePoll, type ElectionPoll } from '@/hooks/useElectionPolls';
import { ExternalLink, Loader2, Trash2, Vote } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer, Cell, LabelList,
} from 'recharts';

const CANDIDATE_COLORS = ['#1a53d8', '#dc2626', '#16a34a', '#d97706', '#7c3aed', '#0891b2'];

function fmtDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** Average of each institute's most recent poll in the round (avoids one
 *  prolific institute dominating the aggregate). */
function aggregate(polls: ElectionPoll[]) {
  const latestByInstitute = new Map<string, ElectionPoll>();
  for (const p of polls) {
    const existing = latestByInstitute.get(p.institute);
    if (!existing || p.survey_date > existing.survey_date) latestByInstitute.set(p.institute, p);
  }
  const totals = new Map<string, { sum: number; count: number }>();
  for (const poll of latestByInstitute.values()) {
    for (const c of poll.candidates) {
      const cur = totals.get(c.name) ?? { sum: 0, count: 0 };
      cur.sum += c.percentage;
      cur.count += 1;
      totals.set(c.name, cur);
    }
  }
  return Array.from(totals.entries())
    .map(([name, { sum, count }]) => ({ name, percentage: Math.round((sum / count) * 10) / 10 }))
    .sort((a, b) => b.percentage - a.percentage);
}

function SetupNeeded() {
  return (
    <div className="content-card p-6 text-sm text-muted-foreground">
      Esta página ainda precisa da tabela <code className="px-1 rounded bg-muted">election_polls</code> no
      banco. Rode <code className="px-1 rounded bg-muted">supabase/manual/election-polls.sql</code> pelo
      workflow "Run SQL Migration" e recarregue esta página.
    </div>
  );
}

export default function Eleicoes2026() {
  const { role } = useAuth();
  const isAdmin = role === 'admin';
  const [round, setRound] = useState<1 | 2>(1);
  const { data, isLoading } = useElectionPolls();
  const deletePoll = useDeletePoll();

  const roundPolls = useMemo(
    () => (data?.polls ?? []).filter((p) => p.round === round),
    [data, round]
  );
  const chartData = useMemo(() => aggregate(roundPolls), [roundPolls]);

  return (
    <div className="space-y-4 p-4 md:p-6 max-w-4xl mx-auto">
      <PageHeader
        title="Eleições 2026"
        subtitle="Agregador de pesquisas eleitorais — média por instituto (última pesquisa de cada um)"
        actions={isAdmin ? <AddPollDialog defaultRound={round} /> : undefined}
      />

      <div className="flex items-center gap-1 rounded-lg border border-border p-1 w-fit">
        {([1, 2] as const).map((r) => (
          <button
            key={r}
            onClick={() => setRound(r)}
            className={cn(
              'px-4 py-1.5 text-sm font-semibold rounded-md transition-colors',
              round === r ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {r}º Turno
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      )}

      {!isLoading && data?.setupNeeded && <SetupNeeded />}

      {!isLoading && !data?.setupNeeded && (
        <>
          <div className="content-card p-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground uppercase tracking-wide mb-4">
              <Vote className="h-4 w-4 text-primary" />
              Média das pesquisas — {round}º Turno
            </h2>
            {chartData.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Nenhuma pesquisa cadastrada para este turno ainda.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(220, chartData.length * 56)}>
                <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 32 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border" />
                  <XAxis type="number" domain={[0, 'dataMax + 5']} tick={{ fontSize: 11 }} unit="%" />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
                  <ChartTooltip formatter={(v: number) => `${v}%`} />
                  <Bar dataKey="percentage" radius={[0, 6, 6, 0]}>
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={CANDIDATE_COLORS[i % CANDIDATE_COLORS.length]} />
                    ))}
                    <LabelList dataKey="percentage" position="right" formatter={(v: number) => `${v}%`} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="content-card p-4">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4">
              Fontes das pesquisas
            </h2>
            {roundPolls.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma pesquisa cadastrada.</p>
            ) : (
              <div className="space-y-2">
                {roundPolls.map((poll) => (
                  <div
                    key={poll.id}
                    className="flex items-start justify-between gap-3 p-3 rounded-lg border border-border"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-foreground text-sm">{poll.institute}</span>
                        {poll.commissioned_by && (
                          <span className="text-xs text-muted-foreground">contratada por {poll.commissioned_by}</span>
                        )}
                        <span className="text-xs text-muted-foreground">· {fmtDate(poll.survey_date)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {poll.candidates.map((c) => `${c.name} ${c.percentage}%`).join(' · ')}
                        {poll.sample_size ? ` · amostra ${poll.sample_size}` : ''}
                        {poll.margin_error ? ` · margem ±${poll.margin_error}p.p.` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {poll.source_url && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                          <a href={poll.source_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </Button>
                      )}
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => deletePoll.mutate(poll.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
