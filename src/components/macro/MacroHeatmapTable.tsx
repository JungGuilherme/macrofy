import { useMemo, Fragment } from "react";
import { MacroDataPoint, MacroMetadata } from "@/hooks/useMacroData";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  SPLIT_SERIES,
  RENAME_SERIES,
  DEFAULT_MODES,
  RAW_IS_VARIATION,
  COMPUTE_12M_ACCUMULATED,
  ANCHOR_SCORING,
  type DisplayMode,
  type AnchorConfig,
} from "./macroConfig";
import { useTheme, type Theme } from "@/contexts/ThemeContext";

interface Props {
  data: MacroDataPoint[];
  metadata: MacroMetadata[];
  isLoading: boolean;
  onRowClick: (seriesCode: string) => void;
  period: number;
}

/* ── Theme-aware color palettes ── */

interface ColorPalette {
  strongGreen: [number, number, number];
  medGreen: [number, number, number];
  neutral: [number, number, number];
  medRed: [number, number, number];
  strongRed: [number, number, number];
  textCell: string;
  noData: string;
  noDataText: string;
}

function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

const PALETTES: Record<Theme, ColorPalette> = {
  light: {
    strongGreen: hexToRgb("#2FA36B"),
    medGreen: hexToRgb("#6CCF9F"),
    neutral: hexToRgb("#E8ECEF"),
    medRed: hexToRgb("#F29B9B"),
    strongRed: hexToRgb("#D65C5C"),
    textCell: "#1A1A1A",
    noData: "#F3F4F6",
    noDataText: "#9CA3AF",
  },
  dark: {
    strongGreen: hexToRgb("#1F7A55"),
    medGreen: hexToRgb("#3FAE7C"),
    neutral: hexToRgb("#5B6675"),
    medRed: hexToRgb("#C66A6A"),
    strongRed: hexToRgb("#8E3B3B"),
    textCell: "#FFFFFF",
    noData: "#1A2332",
    noDataText: "#64748B",
  },
  bloomberg: {
    strongGreen: hexToRgb("#1F7A55"),
    medGreen: hexToRgb("#3FAE7C"),
    neutral: hexToRgb("#5B6675"),
    medRed: hexToRgb("#C66A6A"),
    strongRed: hexToRgb("#8E3B3B"),
    textCell: "#FFFFFF",
    noData: "#111111",
    noDataText: "#666666",
  },
};

/* ── Color interpolation ── */

function lerpRgb(
  a: [number, number, number],
  b: [number, number, number],
  t: number
): string {
  return `rgb(${Math.round(a[0] + (b[0] - a[0]) * t)}, ${Math.round(
    a[1] + (b[1] - a[1]) * t
  )}, ${Math.round(a[2] + (b[2] - a[2]) * t)})`;
}

function getHeatColor(score: number | null, palette: ColorPalette): string {
  if (score === null || score === undefined) return palette.noData;
  const clamped = Math.max(-2, Math.min(2, score));
  const stops = [
    palette.strongRed,
    palette.medRed,
    palette.neutral,
    palette.medGreen,
    palette.strongGreen,
  ];
  const norm = (clamped + 2) / 4;
  const idx = norm * 4;
  const lo = Math.floor(idx);
  const hi = Math.min(lo + 1, 4);
  return lerpRgb(stops[lo], stops[hi], idx - lo);
}

/* ── 12m accumulated from monthly rates ── */

function compute12mAccumulated(
  cells: Map<string, MacroDataPoint>,
  targetMonth: string,
  allMonths: string[]
): number | null {
  const targetIdx = allMonths.indexOf(targetMonth);
  if (targetIdx < 0) return null;
  const startIdx = targetIdx - 11;
  if (startIdx < 0) return null;

  let accumulated = 1;
  let count = 0;
  for (let i = startIdx; i <= targetIdx; i++) {
    const cell = cells.get(allMonths[i]);
    if (!cell || cell.raw_value === null) return null;
    accumulated *= 1 + cell.raw_value / 100;
    count++;
  }
  if (count < 12) return null;
  return (accumulated - 1) * 100;
}

/* ── Anchor-based scoring ── */

function computeAnchorScore(
  value: number,
  config: AnchorConfig,
  polarity: string
): number {
  const scale = config.scalePerUnit ?? 1.0;

  if (config.type === "target") {
    const bandLow = config.bandLow ?? config.center;
    const bandHigh = config.bandHigh ?? config.center;
    const bandWidth = (bandHigh - bandLow) / 2;

    if (value >= bandLow && value <= bandHigh) {
      // Inside band: green. Closer to center = stronger green
      const distFromCenter = Math.abs(value - config.center);
      const normalizedDist = bandWidth > 0 ? distFromCenter / bandWidth : 0;
      return 2 * (1 - normalizedDist); // +2 at center, 0 at edges
    } else {
      // Outside band: red
      const distBeyond =
        value < bandLow ? bandLow - value : value - bandHigh;
      return -Math.min(2, distBeyond * scale);
    }
  }

  // Anchor type: distance from anchor
  const dist = value - config.center;
  let score = -dist * scale; // above anchor = negative (red)
  if (polarity === "positive") score = -score;
  return Math.max(-2, Math.min(2, score));
}

/* ── Per-row scoring ── */

function getRowValue(
  point: MacroDataPoint | undefined,
  mode: DisplayMode,
  isRawVar: boolean
): number | null {
  if (!point) return null;
  if (mode === "mom") {
    return isRawVar ? point.raw_value : point.mom_value;
  }
  if (mode === "yoy") {
    return point.yoy_value;
  }
  return point.raw_value;
}

function computeRowScores(
  cells: Map<string, MacroDataPoint>,
  visibleMonths: string[],
  allMonths: string[],
  mode: DisplayMode,
  isRawVar: boolean,
  polarity: string,
  seriesCode: string
): Map<string, number> {
  const anchor = ANCHOR_SCORING[seriesCode];
  const needs12m = COMPUTE_12M_ACCUMULATED.has(seriesCode) && mode === "yoy";

  const entries: { month: string; val: number }[] = [];

  for (const m of visibleMonths) {
    let val: number | null = null;

    if (needs12m) {
      val = compute12mAccumulated(cells, m, allMonths);
    } else {
      const cell = cells.get(m);
      val = getRowValue(cell, mode, isRawVar);
    }

    if (val !== null) entries.push({ month: m, val });
  }

  const result = new Map<string, number>();

  // Anchor-based scoring
  if (anchor) {
    entries.forEach((e) => {
      result.set(e.month, computeAnchorScore(e.val, anchor, polarity));
    });
    return result;
  }

  // Also apply anchor scoring to 12m accumulated inflation series (target band)
  if (needs12m) {
    // Use IPCA target band for all 12m accumulated inflation series
    const inflationAnchor: AnchorConfig = {
      type: "target",
      center: 3.0,
      bandLow: 1.5,
      bandHigh: 4.5,
      scalePerUnit: 1.0,
    };
    entries.forEach((e) => {
      result.set(e.month, computeAnchorScore(e.val, inflationAnchor, polarity));
    });
    return result;
  }

  // Standard z-score
  if (entries.length < 2) {
    entries.forEach((e) => result.set(e.month, 0));
    return result;
  }

  const nums = entries.map((e) => e.val);
  const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
  const std = Math.sqrt(
    nums.reduce((a, b) => a + (b - mean) ** 2, 0) / nums.length
  );

  if (std < 0.0001) {
    entries.forEach((e) => result.set(e.month, 0));
    return result;
  }

  entries.forEach((e) => {
    let score = (e.val - mean) / std;
    if (polarity === "negative") score = -score;
    result.set(e.month, score);
  });

  return result;
}

/* ── Cell value formatting ── */

function getCellValue(
  point: MacroDataPoint | undefined,
  mode: DisplayMode,
  seriesCode: string,
  cells?: Map<string, MacroDataPoint>,
  month?: string,
  allMonths?: string[]
): string {
  if (!point && mode !== "yoy") return "—";

  const isRawVar = RAW_IS_VARIATION.has(seriesCode);
  const needs12m = COMPUTE_12M_ACCUMULATED.has(seriesCode) && mode === "yoy";

  if (needs12m && cells && month && allMonths) {
    const acc = compute12mAccumulated(cells, month, allMonths);
    if (acc === null) return "—";
    return `${acc.toFixed(2)}%`;
  }

  if (!point) return "—";

  switch (mode) {
    case "mom":
      if (isRawVar) {
        return point.raw_value !== null
          ? `${point.raw_value >= 0 ? "+" : ""}${point.raw_value.toFixed(2)}%`
          : "—";
      }
      return point.mom_value !== null
        ? `${point.mom_value >= 0 ? "+" : ""}${point.mom_value.toFixed(2)}%`
        : "—";
    case "yoy":
      return point.yoy_value !== null
        ? `${point.yoy_value >= 0 ? "+" : ""}${point.yoy_value.toFixed(2)}%`
        : "—";
    default:
      return (
        point.display_value ||
        (point.raw_value !== null ? String(point.raw_value) : "—")
      );
  }
}

function formatMonthShort(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  const months = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez",
  ];
  return `${months[parseInt(month) - 1]} ${year.slice(2)}`;
}

/* ── Row model ── */

interface HeatmapRow {
  category: string;
  label: string;
  seriesCode: string;
  source: string;
  unit: string;
  polarity: string;
  sortOrder: number;
  displayMode: DisplayMode;
  cells: Map<string, MacroDataPoint>;
}

export default function MacroHeatmapTable({
  data,
  metadata,
  isLoading,
  onRowClick,
  period,
}: Props) {
  const { theme } = useTheme();
  const palette = PALETTES[theme] || PALETTES.light;

  const { visibleMonths, allMonths, groupedByCategory } = useMemo(() => {
    /* 1 — compute ALL month columns (for 12m computation) */
    const monthSet = new Set<string>();
    data.forEach((d) => monthSet.add(d.date.substring(0, 7)));
    const allMonths = Array.from(monthSet).sort();
    const visibleMonths = allMonths.slice(-period);

    /* 2 — build cell map per series_code (ALL months, not just visible) */
    const cellsByCode = new Map<string, Map<string, MacroDataPoint>>();
    data.forEach((d) => {
      const mk = d.date.substring(0, 7);
      let m = cellsByCode.get(d.series_code);
      if (!m) {
        m = new Map();
        cellsByCode.set(d.series_code, m);
      }
      m.set(mk, d);
    });

    /* 3 — build rows */
    const rows: HeatmapRow[] = [];

    metadata.forEach((meta) => {
      const code = meta.series_code;
      const cells = cellsByCode.get(code) || new Map();
      if (cells.size === 0) return;

      const firstCell = cells.values().next().value;
      const polarity = firstCell?.polarity || meta.polarity || "positive";

      const splitRules = SPLIT_SERIES[code];
      if (splitRules) {
        splitRules.forEach((rule, i) => {
          rows.push({
            category: meta.category,
            label: `${meta.indicator} ${rule.suffix}`,
            seriesCode: code,
            source: meta.source,
            unit: meta.unit,
            polarity,
            sortOrder: meta.sort_order + i * 0.1,
            displayMode: rule.mode,
            cells,
          });
        });
      } else {
        const renamed = RENAME_SERIES[code];
        rows.push({
          category: meta.category,
          label: renamed || meta.indicator,
          seriesCode: code,
          source: meta.source,
          unit: meta.unit,
          polarity,
          sortOrder: meta.sort_order,
          displayMode: DEFAULT_MODES[code] || "level",
          cells,
        });
      }
    });

    rows.sort((a, b) => a.sortOrder - b.sortOrder);

    const groupedByCategory = new Map<string, HeatmapRow[]>();
    rows.forEach((r) => {
      const list = groupedByCategory.get(r.category) || [];
      list.push(r);
      groupedByCategory.set(r.category, list);
    });

    return { visibleMonths, allMonths, groupedByCategory };
  }, [data, metadata, period]);

  /* Pre-compute per-row scores */
  const rowScores = useMemo(() => {
    const map = new Map<string, Map<string, number>>();
    groupedByCategory.forEach((catRows) => {
      catRows.forEach((row) => {
        const key = `${row.seriesCode}__${row.displayMode}`;
        const isRawVar = RAW_IS_VARIATION.has(row.seriesCode);
        const scores = computeRowScores(
          row.cells,
          visibleMonths,
          allMonths,
          row.displayMode,
          isRawVar,
          row.polarity,
          row.seriesCode
        );
        map.set(key, scores);
      });
    });
    return map;
  }, [groupedByCategory, visibleMonths, allMonths]);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    );
  }

  if (groupedByCategory.size === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <p className="text-lg font-medium">Sem dados disponíveis</p>
        <p className="text-sm mt-1">
          Clique em "Sincronizar" para carregar os dados macroeconômicos.
        </p>
      </div>
    );
  }

  const colWidth = 58;
  const labelWidth = 170;

  const legendColors = {
    strongGreen: lerpRgb(palette.strongGreen, palette.strongGreen, 0),
    medGreen: lerpRgb(palette.medGreen, palette.medGreen, 0),
    neutral: lerpRgb(palette.neutral, palette.neutral, 0),
    medRed: lerpRgb(palette.medRed, palette.medRed, 0),
    strongRed: lerpRgb(palette.strongRed, palette.strongRed, 0),
  };

  return (
    <div className="rounded-lg border border-border overflow-hidden bg-card">
      <div className="overflow-x-auto">
        <table
          className="w-full border-collapse"
          style={{ minWidth: visibleMonths.length * colWidth + labelWidth }}
        >
          <thead>
            <tr className="bg-muted/50">
              <th
                className="sticky left-0 z-20 px-2 py-2 text-left font-semibold text-xs tracking-wide border-r border-border/30 bg-muted/50 text-muted-foreground"
                style={{ minWidth: labelWidth, maxWidth: labelWidth }}
              >
                Indicador
              </th>
              {visibleMonths.map((m) => (
                <th
                  key={m}
                  className="px-0.5 py-2 text-center font-medium text-[10px] tracking-tight text-muted-foreground"
                  style={{ minWidth: colWidth, maxWidth: colWidth }}
                >
                  {formatMonthShort(m)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from(groupedByCategory.entries()).map(([cat, catRows]) => (
              <Fragment key={`cat-${cat}`}>
                <tr>
                  <td
                    colSpan={visibleMonths.length + 1}
                    className="sticky left-0 z-10 px-2 py-1 text-[10px] font-bold uppercase tracking-widest border-y border-border/30 bg-secondary text-muted-foreground"
                  >
                    {cat}
                  </td>
                </tr>
                {catRows.map((row, ri) => {
                  const scoreKey = `${row.seriesCode}__${row.displayMode}`;
                  const scores = rowScores.get(scoreKey);

                  return (
                    <tr
                      key={`${row.seriesCode}-${row.displayMode}-${ri}`}
                      className="cursor-pointer transition-opacity hover:opacity-80"
                      onClick={() => onRowClick(row.seriesCode)}
                    >
                      <td
                        className="sticky left-0 z-10 px-2 py-1 font-medium text-[11px] border-r border-border/30 whitespace-nowrap overflow-hidden text-ellipsis bg-card text-foreground/80"
                        style={{ minWidth: labelWidth, maxWidth: labelWidth }}
                      >
                        {row.label}
                      </td>
                      {visibleMonths.map((m) => {
                        const cell = row.cells.get(m);
                        const value = getCellValue(
                          cell,
                          row.displayMode,
                          row.seriesCode,
                          row.cells,
                          m,
                          allMonths
                        );
                        const score = scores?.get(m) ?? null;
                        return (
                          <Tooltip key={m}>
                            <TooltipTrigger asChild>
                              <td
                                className="px-0.5 py-1 text-center text-[10px] font-mono tabular-nums border-r border-border/[0.15]"
                                style={{
                                  backgroundColor: getHeatColor(score, palette),
                                  color:
                                    score !== null
                                      ? palette.textCell
                                      : palette.noDataText,
                                  minWidth: colWidth,
                                  maxWidth: colWidth,
                                }}
                              >
                                {value}
                              </td>
                            </TooltipTrigger>
                            <TooltipContent
                              side="top"
                              className="text-xs max-w-[260px]"
                            >
                              <div className="space-y-1">
                                <p className="font-semibold">{row.label}</p>
                                <p>{formatMonthShort(m)}</p>
                                {cell && (
                                  <>
                                    <p>Valor: {cell.display_value}</p>
                                    {cell.mom_value !== null &&
                                      !RAW_IS_VARIATION.has(row.seriesCode) && (
                                        <p>
                                          M/M: {cell.mom_value >= 0 ? "+" : ""}
                                          {cell.mom_value.toFixed(2)}%
                                        </p>
                                      )}
                                    {cell.ma3_value !== null && (
                                      <p>
                                        Média 3m: {cell.ma3_value.toFixed(2)}
                                      </p>
                                    )}
                                    <p className="text-muted-foreground">
                                      Fonte: {row.source} · {row.seriesCode}
                                    </p>
                                  </>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </tr>
                  );
                })}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Color legend */}
      <div className="flex items-center justify-center gap-3 py-1.5 px-2 border-t border-border/30 text-[10px] bg-muted/50 text-muted-foreground">
        <span className="font-medium">Escala:</span>
        {[
          { color: legendColors.strongGreen, label: "Muito Forte" },
          { color: legendColors.medGreen, label: "Forte" },
          { color: legendColors.neutral, label: "Neutro" },
          { color: legendColors.medRed, label: "Fraco" },
          { color: legendColors.strongRed, label: "Muito Fraco" },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1">
            <div
              className="w-3 h-2.5 rounded-sm"
              style={{ backgroundColor: color }}
            />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
