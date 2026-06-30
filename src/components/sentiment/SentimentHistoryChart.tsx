import React from "react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceArea, CartesianGrid,
} from "recharts";
import type { SentimentIndex } from "@/hooks/useSentimentIndex";

interface Props {
  data: SentimentIndex[];
}

function getRegimeColor(score: number): string {
  if (score <= 24) return "#dc2626";
  if (score <= 44) return "#f97316";
  if (score <= 55) return "#eab308";
  if (score <= 75) return "#22c55e";
  return "#15803d";
}

export default function SentimentHistoryChart({ data }: Props) {
  if (!data.length) return <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">Sem dados históricos</div>;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="sentimentGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
          </linearGradient>
        </defs>

        {/* Regime background bands */}
        <ReferenceArea y1={0} y2={24} fill="#dc2626" fillOpacity={0.04} />
        <ReferenceArea y1={25} y2={44} fill="#f97316" fillOpacity={0.04} />
        <ReferenceArea y1={45} y2={55} fill="#eab308" fillOpacity={0.04} />
        <ReferenceArea y1={56} y2={75} fill="#22c55e" fillOpacity={0.04} />
        <ReferenceArea y1={76} y2={100} fill="#15803d" fillOpacity={0.04} />

        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
        <XAxis
          dataKey="date"
          tickFormatter={(d) => { const [, m, day] = d.split("-"); return `${day}/${m}`; }}
          fontSize={10}
          stroke="hsl(var(--muted-foreground))"
          interval="preserveStartEnd"
          minTickGap={40}
        />
        <YAxis
          domain={[0, 100]}
          ticks={[0, 25, 50, 75, 100]}
          fontSize={10}
          stroke="hsl(var(--muted-foreground))"
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            borderColor: "hsl(var(--border))",
            borderRadius: "8px",
            fontSize: "12px",
          }}
          formatter={(value: number) => [
            <span key="v" style={{ color: getRegimeColor(value) }}>
              {Math.round(value)} — {
                value <= 24 ? "Extreme Fear" :
                value <= 44 ? "Fear" :
                value <= 55 ? "Neutral" :
                value <= 75 ? "Greed" : "Extreme Greed"
              }
            </span>,
            "Score",
          ]}
          labelFormatter={(d) => {
            const [y, m, day] = (d as string).split("-");
            return `${day}/${m}/${y}`;
          }}
        />
        <Area
          type="monotone"
          dataKey="headline_score"
          stroke="hsl(var(--primary))"
          fill="url(#sentimentGradient)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
