import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Plus, X, Loader2 } from 'lucide-react';
import { useCreatePoll, type CandidateResult } from '@/hooks/useElectionPolls';

export function AddPollDialog({ defaultRound }: { defaultRound: 1 | 2 }) {
  const [open, setOpen] = useState(false);
  const create = useCreatePoll();

  const [round, setRound] = useState<1 | 2>(defaultRound);
  const [institute, setInstitute] = useState('');
  const [commissionedBy, setCommissionedBy] = useState('');
  const [surveyDate, setSurveyDate] = useState('');
  const [sampleSize, setSampleSize] = useState('');
  const [marginError, setMarginError] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [candidates, setCandidates] = useState<CandidateResult[]>([
    { name: '', percentage: 0 },
    { name: '', percentage: 0 },
  ]);

  const reset = () => {
    setRound(defaultRound);
    setInstitute('');
    setCommissionedBy('');
    setSurveyDate('');
    setSampleSize('');
    setMarginError('');
    setSourceUrl('');
    setCandidates([{ name: '', percentage: 0 }, { name: '', percentage: 0 }]);
  };

  const updateCandidate = (i: number, field: keyof CandidateResult, value: string) => {
    setCandidates((prev) =>
      prev.map((c, idx) => (idx === i ? { ...c, [field]: field === 'percentage' ? Number(value) : value } : c))
    );
  };

  const handleSubmit = () => {
    const validCandidates = candidates.filter((c) => c.name.trim() && c.percentage > 0);
    if (!institute.trim() || !surveyDate || validCandidates.length === 0) return;
    create.mutate(
      {
        round,
        institute: institute.trim(),
        commissioned_by: commissionedBy.trim() || null,
        survey_date: surveyDate,
        sample_size: sampleSize ? Number(sampleSize) : null,
        margin_error: marginError ? Number(marginError) : null,
        source_url: sourceUrl.trim() || null,
        candidates: validCandidates,
      },
      { onSuccess: () => { setOpen(false); reset(); } }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Nova pesquisa
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cadastrar pesquisa eleitoral</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Turno</Label>
              <Select value={String(round)} onValueChange={(v) => setRound(Number(v) as 1 | 2)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1º Turno</SelectItem>
                  <SelectItem value="2">2º Turno</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Data da pesquisa</Label>
              <Input type="date" value={surveyDate} onChange={(e) => setSurveyDate(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Instituto</Label>
              <Input placeholder="Ex: Datafolha" value={institute} onChange={(e) => setInstitute(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Contratante</Label>
              <Input placeholder="Ex: Folha" value={commissionedBy} onChange={(e) => setCommissionedBy(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Amostra</Label>
              <Input type="number" placeholder="2000" value={sampleSize} onChange={(e) => setSampleSize(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Margem de erro (p.p.)</Label>
              <Input type="number" step="0.1" placeholder="2" value={marginError} onChange={(e) => setMarginError(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Link da fonte</Label>
            <Input placeholder="https://..." value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Candidatos</Label>
            {candidates.map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  placeholder="Nome"
                  value={c.name}
                  onChange={(e) => updateCandidate(i, 'name', e.target.value)}
                  className="flex-1"
                />
                <Input
                  type="number"
                  step="0.1"
                  placeholder="%"
                  value={c.percentage || ''}
                  onChange={(e) => updateCandidate(i, 'percentage', e.target.value)}
                  className="w-20"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 flex-shrink-0"
                  onClick={() => setCandidates((prev) => prev.filter((_, idx) => idx !== i))}
                  disabled={candidates.length <= 1}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() => setCandidates((prev) => [...prev, { name: '', percentage: 0 }])}
            >
              <Plus className="h-3.5 w-3.5" />
              Candidato
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={create.isPending}>
            {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
