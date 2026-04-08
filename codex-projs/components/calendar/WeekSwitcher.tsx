"use client";

import { format, isSameDay } from "date-fns";

import { cn, getWeekDays, isToday } from "@/lib/utils";

interface WeekSwitcherProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
}

const labels = ["ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ", "ВС"];

export function WeekSwitcher({ selectedDate, onSelectDate }: WeekSwitcherProps) {
  const weekDays = getWeekDays(selectedDate);

  return (
    <div className="grid grid-cols-7 gap-1 rounded-[28px] bg-card p-2 shadow-sm">
      {weekDays.map((day, index) => {
        const active = isSameDay(day, selectedDate);
        const today = isToday(day);

        return (
          <button
            key={day.toISOString()}
            type="button"
            onClick={() => onSelectDate(day)}
            className="flex flex-col items-center gap-1 py-1"
          >
            <span
              className={cn(
                "text-[10px] font-medium uppercase tracking-wide",
                today ? "text-white/80" : "text-muted"
              )}
            >
              {labels[index]}
            </span>
            <span
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition",
                today
                  ? "bg-blue-600 text-white"
                  : active
                    ? "bg-accent text-white"
                    : "text-ink"
              )}
            >
              {format(day, "d")}
            </span>
          </button>
        );
      })}
    </div>
  );
}
