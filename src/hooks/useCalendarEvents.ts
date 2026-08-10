import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CalendarEvent {
  event_type: "earnings" | "dividend";
  country: "BR" | "US";
  ticker: string;
  company_name: string | null;
  event_date: string;
  payment_date: string | null;
  time_of_day: string | null;
  dividend_type: string | null;
  value: number | null;
}

export function useCalendarEvents(eventType: "earnings" | "dividend", country?: "BR" | "US") {
  return useQuery({
    queryKey: ["calendar-events", eventType, country],
    queryFn: async () => {
      let query = supabase
        .from("calendar_events")
        .select("*")
        .eq("event_type", eventType)
        .order("event_date", { ascending: true });
      if (country) query = query.eq("country", country);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as CalendarEvent[];
    },
  });
}
