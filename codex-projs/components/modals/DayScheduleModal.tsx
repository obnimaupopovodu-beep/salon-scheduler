"use client";

import { useEffect, useMemo, useState } from "react";

import { useSupabase } from "@/components/providers/SupabaseProvider";
import {
  DEFAULT_DAY_END_TIME,
  DEFAULT_DAY_START_TIME,
  formatRussianDate,
  getDefaultDaySchedule,
  isBreakOverlap,
  timeStringToMinutes
} from "@/lib/utils";
import type { DayScheduleWithBreaks, ScheduleBreak, Specialist } from "@/types";

interface DayScheduleModalProps {
  open: boolean;
  selectedDate: Date;
  specialist?: Specialist | null;
  schedule?: DayScheduleWithBreaks;
  onClose: () => void;
  onSaved: () => void;
}

function createEmptyBreak(): ScheduleBreak {
  return {
    start_time: "13:00",
    end_time: "14:00"
  };
}

export function DayScheduleModal({
  open,
  selectedDate,
  specialist,
  schedule,
  onClose,
  onSaved
}: DayScheduleModalProps) {
  const supabase = useSupabase();
  const baseSchedule = useMemo(
    () => schedule ?? getDefaultDaySchedule(selectedDate, specialist?.id ?? ""),
    [schedule, selectedDate, specialist?.id]
  );
  const [startTime, setStartTime] = useState(DEFAULT_DAY_START_TIME);
  const [endTime, setEndTime] = useState(DEFAULT_DAY_END_TIME);
  const [isWorkingDay, setIsWorkingDay] = useState(true);
  const [breaks, setBreaks] = useState<ScheduleBreak[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setStartTime(baseSchedule.start_time);
    setEndTime(baseSchedule.end_time);
    setIsWorkingDay(baseSchedule.is_working_day);
    setBreaks(baseSchedule.breaks.length ? baseSchedule.breaks : []);
    setError(null);
  }, [baseSchedule]);

  if (!open || !specialist) {
    return null;
  }

  const save = async () => {
    if (isWorkingDay && timeStringToMinutes(endTime) <= timeStringToMinutes(startTime)) {
      setError("Конец рабочего дня должен быть позже начала.");
      return;
    }

    if (isWorkingDay) {
      for (const currentBreak of breaks) {
        if (timeStringToMinutes(currentBreak.end_time) <= timeStringToMinutes(currentBreak.start_time)) {
          setError("У каждого перерыва конец должен быть позже начала.");
          return;
        }

        if (
          timeStringToMinutes(currentBreak.start_time) < timeStringToMinutes(startTime)
          || timeStringToMinutes(currentBreak.end_time) > timeStringToMinutes(endTime)
        ) {
          setError("Перерывы должны быть внутри рабочего дня.");
          return;
        }
      }

      const sortedBreaks = [...breaks].sort(
        (left, right) => timeStringToMinutes(left.start_time) - timeStringToMinutes(right.start_time)
      );

      for (let index = 0; index < sortedBreaks.length - 1; index += 1) {
        if (isBreakOverlap(sortedBreaks[index], sortedBreaks[index + 1])) {
          setError("Перерывы не должны пересекаться.");
          return;
        }
      }
    }

    setSaving(true);
    setError(null);

    const schedulePayload = {
      specialist_id: specialist.id,
      schedule_date: baseSchedule.schedule_date,
      start_time: startTime,
      end_time: endTime,
      is_working_day: isWorkingDay
    };

    const { data: savedSchedule, error: scheduleError } = await supabase
      .from("day_schedules")
      .upsert(schedulePayload, { onConflict: "specialist_id,schedule_date" })
      .select("*")
      .single();

    if (scheduleError) {
      setError(scheduleError.message);
      setSaving(false);
      return;
    }

    const scheduleId = savedSchedule.id as string;

    const { error: deleteBreaksError } = await supabase
      .from("schedule_breaks")
      .delete()
      .eq("day_schedule_id", scheduleId);

    if (deleteBreaksError) {
      setError(deleteBreaksError.message);
      setSaving(false);
      return;
    }

    const activeBreaks = isWorkingDay ? breaks : [];
    if (activeBreaks.length) {
      const { error: insertBreaksError } = await supabase.from("schedule_breaks").insert(
        activeBreaks.map((currentBreak) => ({
          day_schedule_id: scheduleId,
          start_time: currentBreak.start_time,
          end_time: currentBreak.end_time
        }))
      );

      if (insertBreaksError) {
        setError(insertBreaksError.message);
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    onSaved();
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-slate-950/30" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-4">
        <div className="w-full max-w-[430px] rounded-[32px] bg-card p-5 shadow-sheet">
          <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200" />
          <h3 className="text-lg font-semibold text-ink">Изменить график дня</h3>
          <p className="mt-1 text-sm text-muted">
            {specialist.name}, {formatRussianDate(selectedDate)}
          </p>

          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-ink">Начало рабочего дня</span>
              <input
                type="time"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
                disabled={!isWorkingDay}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-accent disabled:bg-slate-50"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-ink">Конец рабочего дня</span>
              <input
                type="time"
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
                disabled={!isWorkingDay}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-accent disabled:bg-slate-50"
              />
            </label>

            <button
              type="button"
              onClick={() => setIsWorkingDay((current) => !current)}
              className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-sm font-medium ${
                isWorkingDay
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-slate-200 bg-slate-100 text-slate-600"
              }`}
            >
              <span>{isWorkingDay ? "Рабочий день" : "Сделать день нерабочим"}</span>
              <span>{isWorkingDay ? "Вкл" : "Выкл"}</span>
            </button>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-ink">Перерывы</p>
                  <p className="text-xs text-muted">Можно добавить несколько интервалов.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setBreaks((current) => [...current, createEmptyBreak()])}
                  disabled={!isWorkingDay}
                  className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-accent disabled:opacity-50"
                >
                  Добавить
                </button>
              </div>

              <div className="mt-3 space-y-3">
                {breaks.map((currentBreak, index) => (
                  <div key={`${currentBreak.start_time}-${currentBreak.end_time}-${index}`} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                    <input
                      type="time"
                      value={currentBreak.start_time}
                      onChange={(event) =>
                        setBreaks((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, start_time: event.target.value } : item
                          )
                        )
                      }
                      disabled={!isWorkingDay}
                      className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-accent disabled:bg-slate-50"
                    />
                    <input
                      type="time"
                      value={currentBreak.end_time}
                      onChange={(event) =>
                        setBreaks((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, end_time: event.target.value } : item
                          )
                        )
                      }
                      disabled={!isWorkingDay}
                      className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-accent disabled:bg-slate-50"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setBreaks((current) => current.filter((_, itemIndex) => itemIndex !== index))
                      }
                      className="rounded-2xl bg-white px-3 py-3 text-sm text-red-500"
                    >
                      Удалить
                    </button>
                  </div>
                ))}

                {!breaks.length ? (
                  <div className="rounded-2xl bg-white px-4 py-4 text-sm text-muted">
                    Перерывов пока нет.
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {error ? <p className="mt-4 text-sm text-red-500">{error}</p> : null}

          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-ink"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={() => {
                void save();
              }}
              disabled={saving}
              className="rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving ? "Сохраняем..." : "Сохранить"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
