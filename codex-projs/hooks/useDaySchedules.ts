"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useSupabase } from "@/components/providers/SupabaseProvider";
import {
  formatDateKey,
  getDefaultDaySchedule,
  getDayRange,
  getWeekRange
} from "@/lib/utils";
import type { DaySchedule, DayScheduleWithBreaks, ScheduleBreak } from "@/types";

interface UseDaySchedulesOptions {
  specialistId?: string | null;
  branchId?: string;
  date: Date;
  mode?: "day" | "week";
}

export function useDaySchedules({
  specialistId,
  branchId,
  date,
  mode = "day"
}: UseDaySchedulesOptions) {
  const supabase = useSupabase();
  const [schedules, setSchedules] = useState<DayScheduleWithBreaks[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const range = useMemo(
    () => (mode === "day" ? getDayRange(date) : getWeekRange(date)),
    [date, mode]
  );

  const refetch = useCallback(async () => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    if (!specialistId) {
      setSchedules([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    let query = supabase
      .from("day_schedules")
      .select("*")
      .eq("specialist_id", specialistId)
      .gte("schedule_date", formatDateKey(range.start))
      .lte("schedule_date", formatDateKey(range.end));

    if (branchId) {
      query = query.eq("branch_id", branchId);
    }

    const { data: scheduleRows, error: scheduleError } = await query.order("schedule_date", {
      ascending: true
    });

    if (requestIdRef.current !== requestId) {
      return;
    }

    if (scheduleError) {
      setError(scheduleError.message);
      setSchedules([]);
      setLoading(false);
      return;
    }

    const typedSchedules = (scheduleRows as DaySchedule[]) ?? [];
    const scheduleIds = typedSchedules.map((row) => row.id).filter(Boolean) as string[];

    let breakRows: ScheduleBreak[] = [];
    if (scheduleIds.length) {
      const { data: fetchedBreaks, error: breaksError } = await supabase
        .from("schedule_breaks")
        .select("*")
        .in("day_schedule_id", scheduleIds)
        .order("start_time", { ascending: true });

      if (requestIdRef.current !== requestId) {
        return;
      }

      if (breaksError) {
        setError(breaksError.message);
        setSchedules([]);
        setLoading(false);
        return;
      }

      breakRows = (fetchedBreaks as ScheduleBreak[]) ?? [];
    }

    const merged = typedSchedules.map((schedule) => ({
      ...schedule,
      breaks: breakRows.filter((item) => item.day_schedule_id === schedule.id)
    }));

    setSchedules(merged);
    setLoading(false);
  }, [branchId, range.end, range.start, specialistId, supabase]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const getScheduleForDate = useCallback(
    (targetDate: Date) => {
      const dateKey = formatDateKey(targetDate);
      return (
        schedules.find((schedule) => schedule.schedule_date === dateKey)
        ?? getDefaultDaySchedule(targetDate, specialistId ?? "", branchId)
      );
    },
    [branchId, schedules, specialistId]
  );

  return { schedules, loading, error, refetch, getScheduleForDate };
}
