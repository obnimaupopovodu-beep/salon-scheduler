"use client";

import { useCallback, useEffect, useState } from "react";

import { useSupabase } from "@/components/providers/SupabaseProvider";
import type { Specialist } from "@/types";

export function useSpecialists() {
  const supabase = useSupabase();
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from("specialists")
      .select("*")
      .order("created_at", { ascending: true });

    if (fetchError) {
      setError(fetchError.message);
      setSpecialists([]);
    } else {
      setSpecialists((data as Specialist[]) ?? []);
    }

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { specialists, loading, error, refetch };
}
