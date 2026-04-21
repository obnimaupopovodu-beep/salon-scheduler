"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useSupabase } from "@/components/providers/SupabaseProvider";
import { getDayRange, getWeekRange } from "@/lib/utils";
import type { AppointmentWithRelations } from "@/types";

interface UseAppointmentsOptions {
  specialistId?: string | null;
  branchId?: string;
  date: Date;
  mode?: "day" | "week";
}

export function useAppointments({
  specialistId,
  branchId,
  date,
  mode = "day"
}: UseAppointmentsOptions) {
  const supabase = useSupabase();
  const [appointments, setAppointments] = useState<AppointmentWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const range = useMemo(
    () => (mode === "day" ? getDayRange(date) : getWeekRange(date)),
    [date, mode]
  );

  const refetch = useCallback(async () => {
    if (!specialistId) {
      setAppointments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    let query = supabase
      .from("appointments")
      .select("*, specialists(id, name), services(id, name, duration_minutes, price)")
      .eq("specialist_id", specialistId)
      .gte("start_time", range.start.toISOString())
      .lte("start_time", range.end.toISOString());

    if (branchId) {
      query = query.eq("branch_id", branchId);
    }

    const { data, error: fetchError } = await query.order("start_time", { ascending: true });

    if (fetchError) {
      setError(fetchError.message);
      setAppointments([]);
    } else {
      setAppointments((data as AppointmentWithRelations[]) ?? []);
    }

    setLoading(false);
  }, [branchId, range.end, range.start, specialistId, supabase]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  useEffect(() => {
    if (!specialistId) {
      return;
    }

    const channel = supabase
      .channel(`appointments-${specialistId}-${branchId ?? "all"}-${mode}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointments" },
        () => {
          void refetch();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [branchId, mode, refetch, specialistId, supabase]);

  return { appointments, loading, error, refetch };
}
