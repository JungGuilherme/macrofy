import * as XLSX from "xlsx";
import { format, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

interface CurvePoint {
  anos: number;
  taxa: number;
  vencimento: string;
  vencimento_ano: number;
  vencimento_label: string;
}

interface CurveData {
  tipo: string;
  data_base_usada: string;
  pontos: CurvePoint[];
}

function prevBusinessDay(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - 1);
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() - 1);
  }
  return d;
}

async function fetchCurve(tipo: string, date: Date, token?: string): Promise<CurveData | null> {
  const dateStr = format(date, "yyyy-MM-dd");
  const url = `${SUPABASE_URL}/functions/v1/tesouro-curva?tipo=${tipo}&data=${dateStr}`;
  try {
    const response = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

function prefixForTipo(tipo: string): string {
  if (tipo === "IPCA") return "B";
  if (tipo === "PREFIXADA") return "F";
  if (tipo === "SELIC") return "S";
  return "";
}

/** Linear interpolation of a rate (%) at target maturity (years) over a sorted curve by `anos`. */
function interpolateRate(curve: CurvePoint[] | undefined, targetAnos: number): number | null {
  if (!curve || curve.length === 0) return null;
  const sorted = [...curve].sort((a, b) => a.anos - b.anos);
  if (targetAnos <= sorted[0].anos) return sorted[0].taxa;
  if (targetAnos >= sorted[sorted.length - 1].anos) return sorted[sorted.length - 1].taxa;
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (targetAnos >= a.anos && targetAnos <= b.anos) {
      const t = (targetAnos - a.anos) / (b.anos - a.anos);
      return a.taxa + t * (b.taxa - a.taxa);
    }
  }
  return null;
}

function formatVencimento(iso: string): string {
  try {
    return format(parseISO(iso), "dd/MM/yyyy");
  } catch {
    return iso;
  }
}

function buildRows(
  current: CurveData | null,
  previous: CurveData | null,
  counterpart: CurveData | null, // for implied calc
  tipo: string,
) {
  if (!current) return [];
  const prefix = prefixForTipo(tipo);

  // Match prev by exact vencimento date
  const prevByVenc = new Map<string, number>();
  previous?.pontos.forEach((p) => prevByVenc.set(p.vencimento, p.taxa));

  // Use ALL vertices, sorted by maturity date
  const points = [...current.pontos].sort(
    (a, b) => new Date(a.vencimento).getTime() - new Date(b.vencimento).getTime(),
  );

  return points.map((p) => {
    const prev = prevByVenc.get(p.vencimento);
    const variacaoBps =
      prev !== undefined ? Math.round((p.taxa - prev) * 100 * 100) / 100 : null;

    // Implied inflation by interpolating counterpart curve at this vertex's `anos`
    let implicita: number | null = null;
    const counterpartRate = interpolateRate(counterpart?.pontos, p.anos);
    if (counterpartRate !== null) {
      // For DI sheet: counterpart is NTN-B  => implied = (1+DI)/(1+NTNB)-1
      // For NTN-B sheet: counterpart is DI  => implied = (1+DI)/(1+NTNB)-1
      const di = tipo === "PREFIXADA" ? p.taxa : counterpartRate;
      const ntnb = tipo === "IPCA" ? p.taxa : counterpartRate;
      implicita = (((1 + di / 100) / (1 + ntnb / 100)) - 1) * 100;
      implicita = Math.round(implicita * 100) / 100;
    }

    const yearShort = String(p.vencimento_ano).slice(-2);
    return {
      Título: `${prefix}${yearShort}`,
      Vencimento: formatVencimento(p.vencimento),
      "Prazo (anos)": Math.round(p.anos * 100) / 100,
      "Taxa Abertura (%)": Math.round(p.taxa * 100) / 100,
      "Taxa Fech. D-1 (%)": prev !== undefined ? Math.round(prev * 100) / 100 : null,
      "Variação D-1 (bps)": variacaoBps,
      "Implícita (%)": implicita,
    };
  });
}

/** Fetch the curve for the most recent trading day STRICTLY before `currentBaseDate`.
 *  Walks back day-by-day until the edge function returns a different `data_base_usada`.
 */
async function fetchPreviousCurve(
  tipo: string,
  currentBaseDate: string,
  token?: string,
): Promise<CurveData | null> {
  let probe = parseISO(currentBaseDate);
  for (let i = 0; i < 10; i++) {
    probe = prevBusinessDay(probe);
    const curve = await fetchCurve(tipo, probe, token);
    if (curve && curve.data_base_usada && curve.data_base_usada !== currentBaseDate) {
      return curve;
    }
  }
  return null;
}

export async function exportCurvasToExcel(referenceDate: Date) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  // 1) Fetch today's curves (taxa de abertura)
  const [diToday, ntnbToday] = await Promise.all([
    fetchCurve("PREFIXADA", referenceDate, token),
    fetchCurve("IPCA", referenceDate, token),
  ]);

  if (!diToday && !ntnbToday) {
    throw new Error("Não foi possível obter os dados das curvas para a data selecionada.");
  }

  // 2) Fetch previous curves anchored to each curve's actual base date,
  //    guaranteeing a strictly earlier trading day (fechamento D-1)
  const [diPrev, ntnbPrev] = await Promise.all([
    diToday ? fetchPreviousCurve("PREFIXADA", diToday.data_base_usada, token) : Promise.resolve(null),
    ntnbToday ? fetchPreviousCurve("IPCA", ntnbToday.data_base_usada, token) : Promise.resolve(null),
  ]);

  const diRows = buildRows(diToday, diPrev, ntnbToday, "PREFIXADA");
  const ntnbRows = buildRows(ntnbToday, ntnbPrev, diToday, "IPCA");

  const wb = XLSX.utils.book_new();
  const cols = [{ wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 22 }, { wch: 14 }];

  if (diRows.length > 0) {
    const ws = XLSX.utils.json_to_sheet(diRows);
    ws["!cols"] = cols;
    XLSX.utils.book_append_sheet(wb, ws, "DI");
  }
  if (ntnbRows.length > 0) {
    const ws = XLSX.utils.json_to_sheet(ntnbRows);
    ws["!cols"] = cols;
    XLSX.utils.book_append_sheet(wb, ws, "NTN-B");
  }

  const fileName = `curvas_juros_${format(referenceDate, "yyyy-MM-dd")}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
