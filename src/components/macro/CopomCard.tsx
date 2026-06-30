import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle, RefreshCw, Edit, Save, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface CopomScenario {
  scenario: string;
  probability: number;
}

export default function CopomCard() {
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const { toast } = useToast();
  const [scenarios, setScenarios] = useState<CopomScenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [source, setSource] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);
  const [editScenarios, setEditScenarios] = useState<CopomScenario[]>([]);
  const fetchingRef = useRef(false);

  const fetchData = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("copom-proxy");
      if (fnError) throw fnError;

      if (data?.success && data.data?.length > 0) {
        setScenarios(data.data);
        setUpdatedAt(data.updatedAt);
        setSource(data.source);
      } else {
        setError("Dados indisponíveis no momento");
      }
    } catch (err: any) {
      console.error("Copom fetch error:", err);
      setError("Dados indisponíveis no momento");
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const startEditing = () => {
    setEditScenarios(
      scenarios.length > 0
        ? scenarios.map((s) => ({ ...s }))
        : [
            { scenario: "Manutenção", probability: 0 },
            { scenario: "Queda de 0,25%", probability: 0 },
            { scenario: "Aumento de 0,25%", probability: 0 },
          ]
    );
    setIsEditing(true);
  };

  const handleSaveManual = async () => {
    const valid = editScenarios.filter((s) => s.scenario.trim() && s.probability > 0);
    if (valid.length === 0) {
      toast({ title: "Erro", description: "Adicione ao menos um cenário.", variant: "destructive" });
      return;
    }

    try {
      // Clear cache
      await supabase.from("copom_cache").delete().neq("id", "00000000-0000-0000-0000-000000000000");

      // Insert new
      const rows = valid.map((s) => ({
        scenario: s.scenario,
        probability: s.probability,
        updated_at: new Date().toISOString(),
      }));
      const { error } = await supabase.from("copom_cache").insert(rows);
      if (error) throw error;

      setScenarios(valid);
      setUpdatedAt(new Date().toISOString());
      setSource("manual");
      setIsEditing(false);
      toast({ title: "Copom atualizado", description: "Dados salvos com sucesso." });
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    }
  };

  const updateEditScenario = (idx: number, field: keyof CopomScenario, value: string) => {
    setEditScenarios((prev) =>
      prev.map((s, i) =>
        i === idx
          ? { ...s, [field]: field === "probability" ? parseFloat(value) || 0 : value }
          : s
      )
    );
  };

  const addEditRow = () => {
    setEditScenarios((prev) => [...prev, { scenario: "", probability: 0 }]);
  };

  const removeEditRow = (idx: number) => {
    setEditScenarios((prev) => prev.filter((_, i) => i !== idx));
  };

  const maxProb = scenarios.length > 0 ? Math.max(...scenarios.map((s) => s.probability)) : 100;

  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
    } catch {
      return "agora";
    }
  };

  const getNextUpdate = () => {
    const now = new Date();
    const brt = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    const h = brt.getHours();
    if (h < 10) return "hoje às 10h";
    if (h < 15) return "hoje às 15h";
    return "amanhã às 10h";
  };

  return (
    <Card className="border bg-card overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-foreground">
            Expectativas de Juros – Brasil (Copom)
          </CardTitle>
          <div className="flex items-center gap-1">
            {isAdmin && !isEditing && (
              <button
                onClick={startEditing}
                className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded"
                title="Editar manualmente"
              >
                <Edit className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={fetchData}
              disabled={loading || isEditing}
              className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded"
              title="Atualizar"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-4">
        {isEditing ? (
          <div className="space-y-3">
            {editScenarios.map((s, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input
                  value={s.scenario}
                  onChange={(e) => updateEditScenario(idx, "scenario", e.target.value)}
                  placeholder="Ex: Queda de 0,25%"
                  className="flex-1 h-8 text-sm"
                />
                <Input
                  type="number"
                  value={s.probability || ""}
                  onChange={(e) => updateEditScenario(idx, "probability", e.target.value)}
                  placeholder="%"
                  className="w-20 h-8 text-sm"
                  step="0.1"
                />
                <button onClick={() => removeEditRow(idx)} className="text-muted-foreground hover:text-destructive p-1">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addEditRow} className="w-full text-xs">
              + Adicionar cenário
            </Button>
            <div className="flex gap-2 pt-1">
              <Button size="sm" onClick={handleSaveManual} className="flex-1">
                <Save className="h-3.5 w-3.5 mr-1" /> Salvar
              </Button>
              <Button size="sm" variant="outline" onClick={() => setIsEditing(false)} className="flex-1">
                Cancelar
              </Button>
            </div>
          </div>
        ) : loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-12" />
                </div>
                <Skeleton className="h-3 w-full rounded-full" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <AlertCircle className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">{error}</p>
            {isAdmin && (
              <Button size="sm" variant="outline" onClick={startEditing}>
                <Edit className="h-3.5 w-3.5 mr-1" /> Inserir manualmente
              </Button>
            )}
          </div>
        ) : scenarios.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <AlertCircle className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">Dados do Copom indisponíveis</p>
            {isAdmin && (
              <Button size="sm" variant="outline" onClick={startEditing}>
                <Edit className="h-3.5 w-3.5 mr-1" /> Inserir manualmente
              </Button>
            )}
          </div>
        ) : (
          <>
            {scenarios.map((s, idx) => (
              <div key={s.scenario} className="group cursor-default transition-colors rounded-lg px-2 py-1.5 hover:bg-accent/50">
                <div className="flex items-baseline justify-between mb-1.5">
                  <span className="text-sm font-medium text-foreground tracking-tight">{s.scenario}</span>
                  <span className={cn("text-sm font-bold tabular-nums", idx === 0 ? "text-primary" : "text-muted-foreground")}>
                    {s.probability.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-secondary/60 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-700 ease-out",
                      idx === 0 ? "bg-[#0B0F8C]" : idx === 1 ? "bg-[#0B0F8C]/70" : "bg-[#0B0F8C]/40"
                    )}
                    style={{ width: `${(s.probability / maxProb) * 100}%` }}
                  />
                </div>
              </div>
            ))}

            <div className="pt-3 border-t border-border/50 space-y-0.5">
              <p className="text-[11px] text-muted-foreground leading-tight">
                Fonte: B3 – Opções de Copom
                {source === "fallback-hardcoded" && " (dados fixos de 17/03/2026)"}
                {source === "cache" && " (cache)"}
                {source === "brapi-live" && " (ao vivo)"}
                {source === "manual" && " (atualização manual)"}
              </p>
              {updatedAt && (
                <p className="text-[11px] text-muted-foreground/70 leading-tight">
                  Atualizado: {formatTime(updatedAt)} · Próxima: {getNextUpdate()}
                </p>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
