import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import type { SentimentComponent } from "@/hooks/useSentimentIndex";

interface Props {
  components: SentimentComponent[];
  region: "us" | "br";
}

const COMPONENT_INFO: Record<string, Record<string, { name: string; desc: string; icon: string }>> = {
  us: {
    momentum: { name: "Momentum", desc: "S&P 500 vs MM125", icon: "📈" },
    volatility: { name: "Volatilidade", desc: "VIX vs MM50", icon: "⚡" },
    safe_haven: { name: "Safe Haven", desc: "Ações vs Títulos (20d)", icon: "🛡️" },
    junk_bond: { name: "Crédito", desc: "Spread HY (ICE BofA)", icon: "💳" },
    breadth: { name: "Breadth", desc: "% ETFs acima da MM200", icon: "📊" },
  },
  br: {
    momentum: { name: "Momentum", desc: "Ibovespa vs MM125", icon: "📈" },
    strength: { name: "Força", desc: "% ações acima da MM200", icon: "💪" },
    breadth: { name: "Breadth", desc: "% retorno diário positivo", icon: "📊" },
    volatility: { name: "Volatilidade", desc: "Vol. realizada 21d", icon: "⚡" },
    foreign_flow: { name: "Fluxo Estrangeiro", desc: "Soma móvel 21d B3", icon: "🌍" },
  },
};

function getScoreColor(score: number): string {
  if (score <= 24) return "text-red-500";
  if (score <= 44) return "text-orange-500";
  if (score <= 55) return "text-yellow-500";
  if (score <= 75) return "text-green-500";
  return "text-emerald-600";
}

function getScoreBg(score: number): string {
  if (score <= 24) return "bg-red-500/10";
  if (score <= 44) return "bg-orange-500/10";
  if (score <= 55) return "bg-yellow-500/10";
  if (score <= 75) return "bg-green-500/10";
  return "bg-emerald-600/10";
}

function getRegimeShort(score: number): string {
  if (score <= 24) return "Extreme Fear";
  if (score <= 44) return "Fear";
  if (score <= 55) return "Neutral";
  if (score <= 75) return "Greed";
  return "Extreme Greed";
}

export default function SentimentComponentCards({ components, region }: Props) {
  const info = COMPONENT_INFO[region] || {};

  if (!components.length) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        Sem dados de componentes
      </div>
    );
  }

  // Sort by defined order
  const order = Object.keys(info);
  const sorted = [...components].sort(
    (a, b) => order.indexOf(a.component_key) - order.indexOf(b.component_key)
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
      {sorted.map((comp) => {
        const meta = info[comp.component_key] || { name: comp.component_key, desc: "", icon: "📌" };
        const score = Math.round(comp.normalized_score);
        return (
          <Card key={comp.component_key} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{meta.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{meta.name}</p>
                    <p className="text-[10px] text-muted-foreground leading-tight">{meta.desc}</p>
                  </div>
                </div>
                <div className={`text-right ${getScoreColor(score)}`}>
                  <p className="text-xl font-bold leading-none">{score}</p>
                  <p className="text-[9px] font-medium mt-0.5">{getRegimeShort(score)}</p>
                </div>
              </div>
              <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${getScoreBg(score).replace("/10", "")}`}
                  style={{
                    width: `${score}%`,
                    backgroundColor: score <= 24 ? "#dc2626" : score <= 44 ? "#f97316" : score <= 55 ? "#eab308" : score <= 75 ? "#22c55e" : "#15803d",
                  }}
                />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
