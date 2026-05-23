"use client";

import { useCallback, useState } from "react";

import type { AppointmentWithRelations, DayScheduleWithBreaks } from "@/types";

export interface DayBuffer {
  sourceDate: string; // "yyyy-MM-dd"
  specialistId: string;
  branchId: string;
  schedule: DayScheduleWithBreaks;
  appointments: AppointmentWithRelations[];
}

export function useDayBuffer() {
  const [buffer, setBuffer] = useState<DayBuffer | null>(null);

  const copy = useCallback(
    (
      sourceDate: string,
      specialistId: string,
      branchId: string,
      schedule: DayScheduleWithBreaks,
      appointments: AppointmentWithRelations[]
    ) => {
      setBuffer({ sourceDate, specialistId, branchId, schedule, appointments });
    },
    []
  );

  const clear = useCallback(() => setBuffer(null), []);

  return { buffer, copy, clear };
}
