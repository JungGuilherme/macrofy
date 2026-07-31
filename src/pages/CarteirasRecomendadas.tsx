import { PageHeader } from '@/components/common/PageHeader';
import { PdfUpload } from '@/components/common/PdfUpload';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import {
  useStrategicWallets,
  useUpdateWalletPdf,
  type StrategicWallet,
  type WalletCategory,
} from '@/hooks/useStrategicWallets';
import { Briefcase, Download, FileText, Loader2 } from 'lucide-react';

const SECTIONS: { category: WalletCategory; title: string }[] = [
  { category: 'materiais_estrategicos', title: 'Materiais estratégicos' },
  { category: 'asset_allocation', title: 'Asset allocation' },
  { category: 'carteiras_offshore', title: 'Carteiras de Fundos Offshore' },
  { category: 'carteiras_previdencia', title: 'Carteiras de Previdência' },
];

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function WalletCard({ wallet, isAdmin }: { wallet: StrategicWallet; isAdmin: boolean }) {
  const updatePdf = useUpdateWalletPdf();

  return (
    <div className="content-card p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary flex-shrink-0" />
          <span className="font-medium text-foreground">{wallet.label}</span>
        </div>
      </div>

      {wallet.pdf_url && (
        <p className="text-xs text-muted-foreground">Atualizado em {fmtDate(wallet.updated_at)}</p>
      )}

      {isAdmin ? (
        <PdfUpload
          currentUrl={wallet.pdf_url}
          folder="carteiras-recomendadas"
          onUploaded={(url) => updatePdf.mutate({ id: wallet.id, pdf_url: url })}
          onRemoved={() => updatePdf.mutate({ id: wallet.id, pdf_url: null })}
        />
      ) : (
        <Button asChild={!!wallet.pdf_url} disabled={!wallet.pdf_url} className="gap-2 w-full">
          {wallet.pdf_url ? (
            <a href={wallet.pdf_url} target="_blank" rel="noopener noreferrer" download>
              <Download className="h-4 w-4" />
              Baixar PDF
            </a>
          ) : (
            <>
              <Download className="h-4 w-4" />
              Indisponível
            </>
          )}
        </Button>
      )}
    </div>
  );
}

function SetupNeeded() {
  return (
    <div className="content-card p-6 text-sm text-muted-foreground">
      Esta página ainda precisa da tabela <code className="px-1 rounded bg-muted">strategic_wallets</code> no
      banco. Cole o arquivo <code className="px-1 rounded bg-muted">supabase/manual/strategic-wallets.sql</code>{' '}
      no chat do Lovable pedindo "run this SQL in my database" e recarregue esta página.
    </div>
  );
}

export default function CarteirasRecomendadas() {
  const { role } = useAuth();
  const isAdmin = role === 'admin';
  const { data, isLoading } = useStrategicWallets();

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader
        title="Carteiras recomendadas"
        subtitle="Materiais estratégicos, asset allocation e carteiras recomendadas para o assessor baixar."
        breadcrumbs={[{ label: 'Research' }, { label: 'Carteiras recomendadas' }]}
      />

      {isLoading && (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      )}

      {!isLoading && data?.setupNeeded && <SetupNeeded />}

      {!isLoading && !data?.setupNeeded && (
        <div className="space-y-8">
          {SECTIONS.map((section) => {
            const wallets = (data?.wallets ?? []).filter((w) => w.category === section.category);
            if (wallets.length === 0) return null;
            return (
              <section key={section.category}>
                <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground mb-3">
                  <Briefcase className="h-5 w-5 text-primary" />
                  {section.title}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {wallets.map((w) => (
                    <WalletCard key={w.id} wallet={w} isAdmin={isAdmin} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
