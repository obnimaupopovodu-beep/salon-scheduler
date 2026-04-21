"use client";

import { useCallback, useEffect, useState } from "react";

import { useSupabase } from "@/components/providers/SupabaseProvider";
import type { Branch } from "@/types";

export function useBranches() {
  const supabase = useSupabase();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from("branches")
      .select("*")
      .order("created_at", { ascending: true });

    if (fetchError) {
      setError(fetchError.message);
      setBranches([]);
    } else {
      setBranches((data as Branch[]) ?? []);
    }

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { branches, loading, error, refetch };
}
