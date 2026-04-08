"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useSupabase } from "@/components/providers/SupabaseProvider";
import { buildServiceGroups } from "@/lib/utils";
import type { Service, ServiceCategory } from "@/types";

export function useServices() {
  const supabase = useSupabase();
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [
      { data: categoriesData, error: categoriesError },
      { data: servicesData, error: servicesError }
    ] = await Promise.all([
      supabase.from("service_categories").select("*").order("created_at", { ascending: true }),
      supabase.from("services").select("*").order("created_at", { ascending: true })
    ]);

    if (categoriesError || servicesError) {
      setError(categoriesError?.message || servicesError?.message || "Не удалось загрузить услуги.");
      setCategories([]);
      setServices([]);
    } else {
      setCategories((categoriesData as ServiceCategory[]) ?? []);
      setServices((servicesData as Service[]) ?? []);
    }

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const groupedServices = useMemo(
    () => buildServiceGroups(categories, services),
    [categories, services]
  );

  return { categories, services, groupedServices, loading, error, refetch };
}
