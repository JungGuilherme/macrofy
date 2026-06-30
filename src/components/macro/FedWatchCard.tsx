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

interface FedWatchScenario {
  range: string;
  probability: number;
}

export default function FedWatchCard() {
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const { toast } = useToast();
  const [scenarios, setScenarios] = useState<FedWatchScenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [source, setSource] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);
  const [editScenarios, setEditScenarios] = useState<FedWatchScenario[]>([]);
  const fetchingRef = useRef(false);

  const fetchData = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("fedwatch-proxy");
      if (fnError) throw fnError;

      if (data?.success && data.data?.length > 0) {
        setScenarios(data.data);
        setUpdatedAt(data.updatedAt);
        setSource(data.source);
      } else {
        setError("Dados indisponíveis no momento");
      }
    } catch (err: any) {
      console.error("FedWatch fetch error:", err);
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
            { range: "3.50–3.75", probability: 0 },
            { range: "3.75–4.00", probability: 0 },
          ]
    );
    setIsEditing(true);
  };

  const handleSaveManual = async () => {
    const valid = editScenarios.filter((s) => s.range.trim() && s.probability > 0);
    if (valid.length === 0) {
      toast({ title: "Erro", description: "Adicione ao menos um cenário.", variant: "destructive" });
      return;
    }

    try {
      // Clear cache
      await supabase.from("fedwatch_cache").delete().neq("id", "00000000-0000-0000-0000-000000000000");

      const rows = valid.map((s) => ({
        rate_range: s.range,
        probability: s.probability,
        updated_at: new Date().toISOString(),
      }));
      const { error } = await supabase.from("fedwatch_cache").insert(rows);
      if (error) throw error;

      setScenarios(valid);
      setUpdatedAt(new Date().toISOString());
      setSource("manual");
      setIsEditing(false);
      toast({ title: "FedWatch atualizado", description: "Dados salvos com sucesso." });
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    }
  };

  const updateEditScenario = (idx: number, field: keyof FedWatchScenario, value: string) => {
    setEditScenarios((prev) =>
      prev.map((s, i) =>
        i === idx
          ? { ...s, [field]: field === "probability" ? parseFloat(value) || 0 : value }
          : s
      )
    );
  };

  const addEditRow = () => {
    setEditScenarios((prev) => [...prev, { range: "", probability: 0 }]);
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
            Expectativas de Juros – EUA (FedWatch)
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
                  value={s.range}
                  onChange={(e) => updateEditScenario(idx, "range", e.target.value)}
                  placeholder="Ex: 3.50–3.75"
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
                  <Skeleton className="h-4 w-24" />
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
            <p className="text-sm text-muted-foreground">Dados do FedWatch indisponíveis</p>
            {isAdmin && (
              <Button size="sm" variant="outline" onClick={startEditing}>
                <Edit className="h-3.5 w-3.5 mr-1" /> Inserir manualmente
              </Button>
            )}
          </div>
        ) : (
          <>
            {scenarios.map((s, idx) => (
              <div key={s.range} className="group cursor-default transition-colors rounded-lg px-2 py-1.5 hover:bg-accent/50">
                <div className="flex items-baseline justify-between mb-1.5">
                  <span className="text-sm font-medium text-foreground tracking-tight">
                    {s.range.includes("%") ? s.range : `${s.range}%`}
                  </span>
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
                Fonte: CME FedWatch Tool
                {source === "fallback-hardcoded" && " (dados fixos de 17/03/2026)"}
                {source === "cache" && " (cache)"}
                {source === "cme-live" && " (ao vivo)"}
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
