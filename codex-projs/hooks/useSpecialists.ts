"use client";

import { useCallback, useEffect, useState } from "react";

import { useSupabase } from "@/components/providers/SupabaseProvider";
import type { Specialist } from "@/types";

interface UseSpecialistsOptions {
  branchId?: string;
}

export function useSpecialists({ branchId }: UseSpecialistsOptions = {}) {
  const supabase = useSupabase();
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    let specialistIds: string[] | null = null;

    if (branchId) {
      const { data: scheduleRows, error: scheduleError } = await supabase
        .from("day_schedules")
        .select("specialist_id")
        .eq("branch_id", branchId);

      if (scheduleError) {
        setError(scheduleError.message);
        setSpecialists([]);
        setLoading(false);
        return;
      }

      specialistIds = Array.from(
        new Set(
          ((scheduleRows as Array<{ specialist_id: string }> | null) ?? [])
            .map((item) => item.specialist_id)
            .filter(Boolean)
        )
      );

      if (!specialistIds.length) {
        setSpecialists([]);
        setLoading(false);
        return;
      }
    }

    let query = supabase.from("specialists").select("*");

    if (specialistIds) {
      query = query.in("id", specialistIds);
    }

    const { data, error: fetchError } = await query.order("created_at", { ascending: true });

    if (fetchError) {
      setError(fetchError.message);
      setSpecialists([]);
    } else {
      setSpecialists((data as Specialist[]) ?? []);
    }

    setLoading(false);
  }, [branchId, supabase]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { specialists, loading, error, refetch };
}
