"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useSupabase } from "@/components/providers/SupabaseProvider";
import type { Specialist } from "@/types";

interface UseSpecialistsOptions {
  branchId?: string;
  /** When provided, returns only specialists assigned to this service */
  serviceId?: string;
}

export function useSpecialists({ branchId, serviceId }: UseSpecialistsOptions = {}) {
  const supabase = useSupabase();
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const refetch = useCallback(async () => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    setLoading(true);
    setError(null);

    const query = serviceId
      ? supabase
          .from("specialists")
          .select("*, specialist_services!inner(service_id)")
          .eq("specialist_services.service_id", serviceId)
          .order("created_at", { ascending: true })
      : supabase
          .from("specialists")
          .select("*")
          .order("created_at", { ascending: true });

    const { data, error: fetchError } = await query;

    if (requestIdRef.current !== requestId) {
      return;
    }

    if (fetchError) {
      setError(fetchError.message);
      setSpecialists([]);
    } else {
      // Strip joined specialist_services — keep only Specialist fields
      const cleaned = ((data ?? []) as (Specialist & { specialist_services?: unknown })[]).map(
        ({ specialist_services: _ss, ...sp }) => sp as Specialist
      );
      setSpecialists(cleaned);
    }

    setLoading(false);
  }, [branchId, serviceId, supabase]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { specialists, loading, error, refetch };
}
