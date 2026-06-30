import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface GlobalMacroRow {
  country_code: string;
  country_name: string;
  flag: string | null;
  gdp_yoy: number | null;
  gdp_qoq: number | null;
  cpi_yoy: number | null;
  core_cpi_yoy: number | null;
  policy_rate: number | null;
  ten_y_yield: number | null;
  unemployment: number | null;
  current_account_gdp: number | null;
  govt_debt_gdp: number | null;
  source: string | null;
  updated_at: string | null;
}

export function useGlobalMacroData() {
  return useQuery({
    queryKey: ["macro-global-snapshot"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("macro_global_snapshot")
        .select("*")
        .order("gdp_yoy", { ascending: false });
      if (error) throw error;
      return data as GlobalMacroRow[];
    },
  });
}
