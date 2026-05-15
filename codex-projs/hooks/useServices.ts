"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useSupabase } from "@/components/providers/SupabaseProvider";
import { buildServiceGroups } from "@/lib/utils";
import type { Service, ServiceCategory } from "@/types";

interface UseServicesOptions {
  /** When provided, returns only services assigned to this specialist */
  specialistId?: string;
}

export function useServices({ specialistId }: UseServicesOptions = {}) {
  const supabase = useSupabase();
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    const servicesQuery = specialistId
      ? supabase
          .from("services")
          .select("*, specialist_services!inner(specialist_id)")
          .eq("specialist_services.specialist_id", specialistId)
          .order("created_at", { ascending: true })
      : supabase
          .from("services")
          .select("*")
          .order("created_at", { ascending: true });

    const [
      { data: categoriesData, error: categoriesError },
      { data: servicesData, error: servicesError }
    ] = await Promise.all([
      supabase.from("service_categories").select("*").order("created_at", { ascending: true }),
      servicesQuery
    ]);

    if (categoriesError || servicesError) {
      setError(categoriesError?.message || servicesError?.message || "Не удалось загрузить услуги.");
      setCategories([]);
      setServices([]);
    } else {
      setCategories((categoriesData as ServiceCategory[]) ?? []);
      // Strip the joined specialist_services array — keep only Service fields
      const cleaned = ((servicesData ?? []) as (Service & { specialist_services?: unknown })[]).map(
        ({ specialist_services: _ss, ...svc }) => svc as Service
      );
      setServices(cleaned);
    }

    setLoading(false);
  }, [supabase, specialistId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const groupedServices = useMemo(
    () => buildServiceGroups(categories, services),
    [categories, services]
  );

  return { categories, services, groupedServices, loading, error, refetch };
}
