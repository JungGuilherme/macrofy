import { PageHeader } from '@/components/common/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Target, TrendingUp, AlertCircle, BarChart3 } from 'lucide-react';

export default function Projections() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Projeções"
        subtitle="Projeções macroeconômicas da casa"
        breadcrumbs={[{ label: 'Projeções' }]}
      />

      {/* Coming Soon Banner */}
      <div className="bg-gold/10 border border-gold/20 rounded-xl p-6 flex items-start gap-4">
        <div className="w-12 h-12 rounded-full bg-gold/20 flex items-center justify-center flex-shrink-0">
          <Target className="h-6 w-6 text-gold" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground mb-1">Em Desenvolvimento</h3>
          <p className="text-sm text-muted-foreground">
            O módulo de projeções está sendo desenvolvido. Em breve você terá acesso
            às projeções de IPCA, Selic, PIB e comparativos com o mercado.
          </p>
        </div>
      </div>

      {/* Preview Structure */}
      <Tabs defaultValue="ipca" className="space-y-6">
        <TabsList>
          <TabsTrigger value="ipca">IPCA</TabsTrigger>
          <TabsTrigger value="selic">Selic</TabsTrigger>
          <TabsTrigger value="pib">PIB</TabsTrigger>
          <TabsTrigger value="comparativo">Comparativo</TabsTrigger>
        </TabsList>

        <TabsContent value="ipca" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-card rounded-xl border p-6">
              <h3 className="font-semibold text-foreground mb-4">Projeção 12 meses</h3>
              <div className="h-48 flex items-center justify-center bg-muted/50 rounded-lg">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Gráfico em desenvolvimento</p>
                </div>
              </div>
            </div>
            <div className="bg-card rounded-xl border p-6">
              <h3 className="font-semibold text-foreground mb-4">Projeção 24 meses</h3>
              <div className="h-48 flex items-center justify-center bg-muted/50 rounded-lg">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Gráfico em desenvolvimento</p>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="selic" className="space-y-4">
          <div className="bg-card rounded-xl border p-6">
            <h3 className="font-semibold text-foreground mb-4">Trajetória da Selic</h3>
            <div className="h-64 flex items-center justify-center bg-muted/50 rounded-lg">
              <div className="text-center">
                <TrendingUp className="h-12 w-12 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Gráfico em desenvolvimento</p>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="pib" className="space-y-4">
          <div className="bg-card rounded-xl border p-6">
            <h3 className="font-semibold text-foreground mb-4">Crescimento do PIB</h3>
            <div className="h-64 flex items-center justify-center bg-muted/50 rounded-lg">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Gráfico em desenvolvimento</p>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="comparativo" className="space-y-4">
          <div className="bg-card rounded-xl border p-6">
            <div className="flex items-start gap-3 mb-4">
              <AlertCircle className="h-5 w-5 text-muted-foreground" />
              <div>
                <h3 className="font-semibold text-foreground">Sobre Câmbio</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  A Alta Vista não produz projeções próprias de câmbio. Nesta seção,
                  apresentaremos apenas comparativos com projeções do Focus e de outras casas.
                </p>
              </div>
            </div>
            <div className="h-48 flex items-center justify-center bg-muted/50 rounded-lg">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Comparativo em desenvolvimento</p>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
