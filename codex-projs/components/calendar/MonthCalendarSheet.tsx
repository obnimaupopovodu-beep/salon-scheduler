"use client";

import { addMonths, format, isSameDay, subMonths } from "date-fns";
import { ru } from "date-fns/locale";
import { useEffect, useState } from "react";

import { cn, formatDateKey, getMonthGridDays, isPast, isToday } from "@/lib/utils";
import type { DayScheduleWithBreaks } from "@/types";

const DAY_LABELS = ["ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ", "ВС"];

interface MonthCalendarSheetProps {
  open: boolean;
  selectedDate: Date;
  schedules: DayScheduleWithBreaks[];
  onSelectDate: (date: Date) => void;
  onClose: () => void;
}

export function MonthCalendarSheet({
  open,
  selectedDate,
  schedules,
  onSelectDate,
  onClose
}: MonthCalendarSheetProps) {
  const [viewDate, setViewDate] = useState(selectedDate);

  // sync viewDate when sheet opens
  useEffect(() => {
    if (open) setViewDate(selectedDate);
  }, [open, selectedDate]);

  if (!open) return null;

  const cells = getMonthGridDays(viewDate);

  // Build a Set of working day keys for O(1) lookup
  const workingDayKeys = new Set(
    schedules
      .filter((s) => s.is_working_day)
      .map((s) => s.schedule_date)
  );
  // Build a Set of explicitly set day-off keys
  const dayOffKeys = new Set(
    schedules
      .filter((s) => !s.is_working_day)
      .map((s) => s.schedule_date)
  );

  const monthLabel = format(viewDate, "LLLL yyyy", { locale: ru });

  const handleSelect = (day: Date) => {
    onSelectDate(day);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-slate-950/30"
        onClick={onClose}
      />

      {/* Bottom sheet */}
      <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-3 pb-4">
        <div className="w-full max-w-[430px] rounded-[32px] bg-white p-5 shadow-xl">
          {/* Drag handle */}
          <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200" />

          {/* Month nav */}
          <div className="mb-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setViewDate((d) => subMonths(d, 1))}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-lg text-accent transition active:scale-95"
              aria-label="Предыдущий месяц"
            >
              ‹
            </button>

            <span className="text-sm font-semibold capitalize text-ink">
              {monthLabel}
            </span>

            <button
              type="button"
              onClick={() => setViewDate((d) => addMonths(d, 1))}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-lg text-accent transition active:scale-95"
              aria-label="Следующий месяц"
            >
              ›
            </button>
          </div>

          {/* Day-of-week headers */}
          <div className="mb-1 grid grid-cols-7">
            {DAY_LABELS.map((label) => (
              <div
                key={label}
                className="text-center text-[10px] font-medium uppercase tracking-wide text-muted"
              >
                {label}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, idx) => {
              if (!day) {
                return <div key={`empty-${idx}`} />;
              }

              const key = formatDateKey(day);
              const todayDay = isToday(day);
              const past = isPast(day);
              const active = isSameDay(day, selectedDate);
              const working = workingDayKeys.has(key);
              const dayOff = dayOffKeys.has(key);

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleSelect(day)}
                  className={cn(
                    "flex h-10 w-full items-center justify-center rounded-xl text-sm font-semibold transition active:scale-95",
                    // Past days — dimmed
                    past && "opacity-35",
                    // Today
                    todayDay && "bg-blue-600 text-white",
                    // Selected (not today)
                    !todayDay && active && "ring-2 ring-accent ring-offset-1",
                    // Working day (has schedule with is_working_day=true)
                    !todayDay && !active && working && "bg-teal-100 text-teal-800",
                    // Explicit day off
                    !todayDay && !active && dayOff && "bg-slate-200 text-slate-500",
                    // No data
                    !todayDay && !active && !working && !dayOff && "text-ink"
                  )}
                >
                  {format(day, "d")}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
            <LegendItem color="bg-teal-100" label="Рабочий день" />
            <LegendItem color="bg-slate-200" label="Выходной" />
            <LegendItem color="bg-blue-600" label="Сегодня" />
          </div>
        </div>
      </div>
    </>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={cn("h-3 w-3 rounded-sm", color)} />
      <span className="text-xs text-muted">{label}</span>
    </div>
  );
}
