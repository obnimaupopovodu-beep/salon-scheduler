"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useSupabase } from "@/components/providers/SupabaseProvider";
import type { Client } from "@/types";

export function useClients(search: string) {
  const supabase = useSupabase();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  const query = useMemo(() => (search ?? "").trim(), [search]);

  const refetch = useCallback(
    async (value: string) => {
      setLoading(true);
      setError(null);

      const safe = value.replaceAll("%", "\\%").replaceAll("_", "\\_");

      const base = supabase.from("clients").select("*").order("created_at", { ascending: false });
      const request =
        safe.length > 0 ? base.or(`name.ilike.%${safe}%,phone.ilike.%${safe}%`) : base;

      const { data, error: fetchError } = await request;

      if (fetchError) {
        setError(fetchError.message);
        setClients([]);
      } else {
        setClients((data as Client[]) ?? []);
      }

      setLoading(false);
    },
    [supabase]
  );

  useEffect(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }

    timerRef.current = window.setTimeout(() => {
      void refetch(query);
    }, 300);

    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, [query, refetch]);

  return { clients, loading, error };
}

