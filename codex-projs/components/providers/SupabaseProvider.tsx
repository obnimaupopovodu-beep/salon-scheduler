"use client";

import {
  createContext,
  useContext,
  useMemo,
  type PropsWithChildren
} from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";

const SupabaseContext = createContext<SupabaseClient | null>(null);

export function SupabaseProvider({ children }: PropsWithChildren) {
  const client = useMemo(() => createClient(), []);

  return <SupabaseContext.Provider value={client}>{children}</SupabaseContext.Provider>;
}

export function useSupabase() {
  const client = useContext(SupabaseContext);

  if (!client) {
    throw new Error("SupabaseProvider is missing from the tree.");
  }

  return client;
}
