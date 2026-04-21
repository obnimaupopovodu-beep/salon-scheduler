"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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
  const requestIdRef = useRef(0);

  const refetch = useCallback(async () => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from("specialists")
      .select("*")
      .order("created_at", { ascending: true });

    if (requestIdRef.current !== requestId) {
      return;
    }

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
