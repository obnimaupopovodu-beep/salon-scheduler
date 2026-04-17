"use client";

import { addMinutes, format } from "date-fns";
import { useEffect, useMemo, useRef, useState } from "react";

import { AppointmentBlock } from "@/components/calendar/AppointmentBlock";
import {
  DEFAULT_DAY_END_TIME,
  DEFAULT_DAY_START_TIME,
  GRID_ROW_HEIGHT,
  getDefaultDaySchedule,
  timeStringToDate,
  timeStringToMinutes
} from "@/lib/utils";
import type { AppointmentWithRelations, DayScheduleWithBreaks } from "@/types";

interface TimeGridProps {
  selectedDate: Date;
  appointments: AppointmentWithRelations[];
  schedule?: DayScheduleWithBreaks;
  onSelectTime: (date: Date) => void;
  onSelectAppointment: (appointment: AppointmentWithRelations) => void;
}

export function TimeGrid({
  selectedDate,
  appointments,
  schedule,
  onSelectTime,
  onSelectAppointment
}: TimeGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const hasAutoScrolledRef = useRef(false);
  const [indicatorTop, setIndicatorTop] = useState<number>(-1);
  const activeSchedule = schedule ?? getDefaultDaySchedule(selectedDate);
  const startTime = activeSchedule.start_time || DEFAULT_DAY_START_TIME;
  const endTime = activeSchedule.end_time || DEFAULT_DAY_END_TIME;
  const startMinutes = timeStringToMinutes(startTime);
  const endMinutes = timeStringToMinutes(endTime);
  const totalHours = Math.max(Math.ceil((endMinutes - startMinutes) / 60), 1);

  const rows = useMemo(() => {
    const rowStart = timeStringToDate(selectedDate, startTime);
    return Array.from({ length: totalHours + 1 }, (_, index) => addMinutes(rowStart, index * 60));
  }, [selectedDate, startTime, totalHours]);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const beforeStart = currentMinutes < startMinutes;
      const afterEnd = currentMinutes > endMinutes;

      if (beforeStart || afterEnd) {
        setIndicatorTop(-1);
        return;
      }

      setIndicatorTop(((currentMinutes - startMinutes) / 60) * GRID_ROW_HEIGHT);
    };

    update();
    const interval = window.setInterval(update, 60_000);
    return () => window.clearInterval(interval);
  }, [endMinutes, startMinutes]);

  const showIndicator = useMemo(() => {
    const now = new Date();
    const sameDate = now.toDateString() === selectedDate.toDateString();
    const maxTop = totalHours * GRID_ROW_HEIGHT;
    return sameDate && indicatorTop >= 0 && indicatorTop <= maxTop;
  }, [indicatorTop, selectedDate, totalHours]);

  useEffect(() => {
    if (!containerRef.current || !showIndicator) {
      return;
    }

    if (hasAutoScrolledRef.current) {
      return;
    }

    hasAutoScrolledRef.current = true;
    const containerHeight = containerRef.current.clientHeight;
    containerRef.current.scrollTo({
      top: Math.max(indicatorTop - containerHeight / 3, 0),
      behavior: "smooth"
    });
  }, [indicatorTop, showIndicator]);

  useEffect(() => {
    if (showIndicator) {
      return;
    }
    hasAutoScrolledRef.current = false;
  }, [showIndicator]);

  const handleGridClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!activeSchedule.is_working_day) {
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    const y = event.clientY - bounds.top + event.currentTarget.scrollTop;
    const totalMinutes = Math.max(0, (y / GRID_ROW_HEIGHT) * 60);
    const rounded = Math.round(totalMinutes / 30) * 30;
    const targetMinutes = Math.min(startMinutes + rounded, endMinutes);
    const insideBreak = activeSchedule.breaks.some((scheduleBreak) => {
      const breakStart = timeStringToMinutes(scheduleBreak.start_time);
      const breakEnd = timeStringToMinutes(scheduleBreak.end_time);
      return targetMinutes >= breakStart && targetMinutes < breakEnd;
    });

    if (targetMinutes >= endMinutes || insideBreak) {
      return;
    }

    const targetDate = timeStringToDate(selectedDate, `${Math.floor(targetMinutes / 60)
      .toString()
      .padStart(2, "0")}:${(targetMinutes % 60).toString().padStart(2, "0")}`);

    onSelectTime(targetDate);
  };

  return (
    <div
      ref={containerRef}
      className="relative h-[calc(100dvh-240px)] overflow-y-auto rounded-[28px] bg-card scrollbar-none"
      onClick={handleGridClick}
    >
      <div className="relative" style={{ height: totalHours * GRID_ROW_HEIGHT }}>
        {rows.slice(0, -1).map((row) => (
          <div
            key={row.toISOString()}
            className="relative flex items-start"
            style={{ height: GRID_ROW_HEIGHT }}
          >
            <div className="w-14 pt-2 text-center text-sm font-medium text-muted">
              {format(row, "HH:mm")}
            </div>
            <div className="mt-4 h-px flex-1 bg-slate-200" />
          </div>
        ))}

        {activeSchedule.breaks.map((scheduleBreak) => {
          const breakStart = timeStringToMinutes(scheduleBreak.start_time);
          const breakEnd = timeStringToMinutes(scheduleBreak.end_time);
          const top = ((breakStart - startMinutes) / 60) * GRID_ROW_HEIGHT;
          const height = ((breakEnd - breakStart) / 60) * GRID_ROW_HEIGHT;

          return (
            <div
              key={`${scheduleBreak.start_time}-${scheduleBreak.end_time}`}
              className="pointer-events-none absolute left-14 right-3 rounded-2xl bg-slate-100/80 ring-1 ring-inset ring-slate-200"
              style={{ top, height }}
            >
              <div className="px-3 py-2 text-xs font-medium text-slate-500">Перерыв</div>
            </div>
          );
        })}

        {showIndicator ? (
          <div
            className="pointer-events-none absolute left-14 right-3 z-20"
            style={{ top: `${indicatorTop}px` }}
          >
            <div className="relative flex items-center">
              <div className="-ml-1 h-2 w-2 rounded-full bg-orange-500" />
              <div className="h-0.5 flex-1 bg-orange-500" />
            </div>
          </div>
        ) : null}

        {appointments.map((appointment) => (
          <AppointmentBlock
            key={appointment.id}
            appointment={appointment}
            scheduleStartTime={startTime}
            onClick={onSelectAppointment}
          />
        ))}

        {!activeSchedule.is_working_day ? (
          <div className="absolute inset-x-14 top-8 rounded-2xl bg-slate-100 px-4 py-6 text-center text-sm text-muted">
            Этот день отмечен как нерабочий.
          </div>
        ) : null}
      </div>
    </div>
  );
}
