import { useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, RefreshCw } from 'lucide-react';

const SOURCES = {
  '1': { url: 'https://eleicaobr.netlify.app/polls/1', label: '1º Turno' },
  '2': { url: 'https://eleicaobr.netlify.app/polls/2', label: '2º Turno' },
} as const;

export default function Eleicoes2026() {
  const [tab, setTab] = useState<'1' | '2'>('1');
  const [reloadKey, setReloadKey] = useState(0);

  const current = SOURCES[tab];

  return (
    <div className="space-y-4 p-4 md:p-6">
      <PageHeader
        title="Eleições 2026"
        subtitle="Pesquisas eleitorais agregadas — fonte: eleicaobr.netlify.app"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setReloadKey(k => k + 1)}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href={current.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Abrir fonte
              </a>
            </Button>
          </div>
        }
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as '1' | '2')}>
        <TabsList>
          <TabsTrigger value="1">1º Turno</TabsTrigger>
          <TabsTrigger value="2">2º Turno</TabsTrigger>
        </TabsList>

        {(['1', '2'] as const).map((key) => (
          <TabsContent key={key} value={key} className="mt-4">
            <Card className="overflow-hidden">
              <iframe
                key={`${key}-${reloadKey}`}
                src={SOURCES[key].url}
                title={`Eleições 2026 - ${SOURCES[key].label}`}
                className="w-full border-0"
                style={{ height: 'calc(100vh - 220px)', minHeight: 700 }}
                loading="lazy"
              />
            </Card>
            <p className="text-xs text-muted-foreground mt-2">
              Conteúdo embedado de <a href={SOURCES[key].url} target="_blank" rel="noopener noreferrer" className="underline">eleicaobr.netlify.app</a>. Caso o site bloqueie iframes, use "Abrir fonte".
            </p>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
