"use client";

import { format, isSameDay } from "date-fns";

import { cn, getWeekDays, isToday } from "@/lib/utils";

interface WeekSwitcherProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  /** Предыдущая неделя (как свайп влево на мобильной версии расписания). */
  onPreviousWeek?: () => void;
  /** Следующая неделя (как свайп вправо). */
  onNextWeek?: () => void;
}

const labels = ["ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ", "ВС"];

const arrowButtonClass =
  "flex h-11 w-9 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-lg font-semibold text-ink shadow-sm transition active:scale-[0.98]";

export function WeekSwitcher({
  selectedDate,
  onSelectDate,
  onPreviousWeek,
  onNextWeek
}: WeekSwitcherProps) {
  const weekDays = getWeekDays(selectedDate);
  const showWeekArrows = Boolean(onPreviousWeek && onNextWeek);

  return (
    <div className="flex items-stretch gap-2">
      {showWeekArrows ? (
        <button
          type="button"
          className={arrowButtonClass}
          aria-label="Предыдущая неделя"
          onClick={onPreviousWeek}
        >
          ‹
        </button>
      ) : null}

      <div className="min-w-0 flex-1 grid grid-cols-7 gap-1 rounded-[28px] bg-card p-2 shadow-sm">
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

      {showWeekArrows ? (
        <button
          type="button"
          className={arrowButtonClass}
          aria-label="Следующая неделя"
          onClick={onNextWeek}
        >
          ›
        </button>
      ) : null}
    </div>
  );
}
