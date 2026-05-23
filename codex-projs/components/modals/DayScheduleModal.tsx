"use client";

import { format } from "date-fns";
import { useEffect, useMemo, useState } from "react";

import { useSupabase } from "@/components/providers/SupabaseProvider";
import {
  DEFAULT_DAY_END_TIME,
  DEFAULT_DAY_START_TIME,
  formatDateKey,
  formatRussianDate,
  getDefaultDaySchedule,
  isBreakOverlap,
  timeStringToMinutes
} from "@/lib/utils";
import type {
  AppointmentPayload,
  AppointmentWithRelations,
  DayScheduleWithBreaks,
  ScheduleBreak,
  Specialist
} from "@/types";
import type { DayBuffer } from "@/hooks/useDayBuffer";

interface DayScheduleModalProps {
  open: boolean;
  selectedDate: Date;
  branchId: string;
  specialist?: Specialist | null;
  schedule?: DayScheduleWithBreaks;
  appointments?: AppointmentWithRelations[];
  dayBuffer?: DayBuffer | null;
  onClose: () => void;
  onSaved: () => void;
  onCopyDay: () => void;
}

function createEmptyBreak(): ScheduleBreak {
  return { start_time: "13:00", end_time: "14:00" };
}

function toHHMM(isoString: string) {
  return isoString.slice(11, 16);
}

function buildClipboardText(
  appointments: AppointmentWithRelations[],
  specialist: Specialist,
  date: Date
): string {
  const dateLabel = formatRussianDate(date, "d MMMM yyyy");
  const header = `\uD83D\uDCC5 Записи на ${dateLabel} — ${specialist.name}`;
  if (!appointments.length) return `${header}\n\nЗаписей нет.`;
  const sorted = [...appointments].sort(
    (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  );
  const lines = sorted.map((apt) => {
    const service = apt.services?.name ?? "Услуга не указана";
    const client = apt.client_name || "—";
    const phone = apt.client_phone || "—";
    const notes = apt.notes ? ` · \uD83D\uDCCB ${apt.notes}` : "";
    return `${toHHMM(apt.start_time)}–${toHHMM(apt.end_time)}  ${service}  ·  ${client}  ${phone}${notes}`;
  });
  return `${header}\n\n${lines.join("\n")}`;
}

/** Shift an ISO datetime string to a different date, keeping the same HH:mm:ss */
function shiftToDate(isoString: string, targetDateKey: string): string {
  // isoString: "2026-05-23T10:00:00.000Z" — use local time part from original
  const original = new Date(isoString);
  const timeStr = `${String(original.getHours()).padStart(2, "0")}:${String(original.getMinutes()).padStart(2, "0")}:${String(original.getSeconds()).padStart(2, "0")}`;
  return new Date(`${targetDateKey}T${timeStr}`).toISOString();
}

export function DayScheduleModal({
  open,
  selectedDate,
  branchId,
  specialist,
  schedule,
  appointments = [],
  dayBuffer,
  onClose,
  onSaved,
  onCopyDay
}: DayScheduleModalProps) {
  const supabase = useSupabase();
  const baseSchedule = useMemo(
    () => schedule ?? getDefaultDaySchedule(selectedDate, specialist?.id ?? "", branchId),
    [branchId, schedule, selectedDate, specialist?.id]
  );
  const [startTime, setStartTime] = useState(DEFAULT_DAY_START_TIME);
  const [endTime, setEndTime] = useState(DEFAULT_DAY_END_TIME);
  const [isWorkingDay, setIsWorkingDay] = useState(true);
  const [breaks, setBreaks] = useState<ScheduleBreak[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [pasting, setPasting] = useState(false);
  const [copyToast, setCopyToast] = useState<"idle" | "ok" | "err">("idle");
  const [pasteToast, setPasteToast] = useState<"idle" | "ok" | "err">("idle");
  const [showPasteConfirm, setShowPasteConfirm] = useState(false);

  useEffect(() => {
    setStartTime(baseSchedule.start_time);
    setEndTime(baseSchedule.end_time);
    setIsWorkingDay(baseSchedule.is_working_day);
    setBreaks(baseSchedule.breaks.length ? baseSchedule.breaks : []);
    setError(null);
    setShowPasteConfirm(false);
  }, [baseSchedule, open]);

  if (!open || !specialist) return null;

  const targetDateKey = formatDateKey(selectedDate);
  const hasBuffer = !!dayBuffer;
  const bufferIsSameDay = dayBuffer?.sourceDate === targetDateKey;

  // ─── Copy ───────────────────────────────────────────────────────────────
  const handleCopy = async () => {
    const text = buildClipboardText(appointments, specialist, selectedDate);
    try {
      await navigator.clipboard.writeText(text);
      setCopyToast("ok");
    } catch {
      setCopyToast("err");
    }
    setTimeout(() => setCopyToast("idle"), 2200);
    onCopyDay(); // save structured data to parent buffer
  };

  // ─── Paste ──────────────────────────────────────────────────────────────
  const executePaste = async () => {
    if (!dayBuffer) return;
    setPasting(true);
    setError(null);
    setShowPasteConfirm(false);

    // 1. Replace schedule
    const schedulePayload = {
      specialist_id: specialist.id,
      branch_id: branchId,
      schedule_date: targetDateKey,
      start_time: dayBuffer.schedule.start_time,
      end_time: dayBuffer.schedule.end_time,
      is_working_day: dayBuffer.schedule.is_working_day
    };

    const { data: savedSchedule, error: scheduleError } = await supabase
      .from("day_schedules")
      .upsert(schedulePayload, { onConflict: "specialist_id,schedule_date,branch_id" })
      .select("*")
      .single();

    if (scheduleError) {
      setError(scheduleError.message);
      setPasting(false);
      return;
    }

    const scheduleId = savedSchedule.id as string;

    // 2. Replace breaks
    await supabase.from("schedule_breaks").delete().eq("day_schedule_id", scheduleId);
    if (dayBuffer.schedule.breaks.length) {
      await supabase.from("schedule_breaks").insert(
        dayBuffer.schedule.breaks.map((b) => ({
          day_schedule_id: scheduleId,
          start_time: b.start_time,
          end_time: b.end_time
        }))
      );
    }

    // 3. Delete existing appointments for target day
    const dayStart = new Date(`${targetDateKey}T00:00:00`);
    const dayEnd = new Date(`${targetDateKey}T23:59:59`);
    await supabase
      .from("appointments")
      .delete()
      .eq("specialist_id", specialist.id)
      .eq("branch_id", branchId)
      .gte("start_time", dayStart.toISOString())
      .lte("start_time", dayEnd.toISOString());

    // 4. Insert shifted appointments
    if (dayBuffer.appointments.length) {
      const payloads: AppointmentPayload[] = dayBuffer.appointments.map((apt) => ({
        specialist_id: specialist.id,
        branch_id: branchId,
        service_id: apt.service_id ?? "",
        client_name: apt.client_name,
        client_phone: apt.client_phone,
        confirmation: 0 as 0 | 1,
        start_time: shiftToDate(apt.start_time, targetDateKey),
        end_time: shiftToDate(apt.end_time, targetDateKey),
        notes: apt.notes ?? undefined
      }));

      const { error: insertError } = await supabase.from("appointments").insert(payloads);
      if (insertError) {
        setError(insertError.message);
        setPasting(false);
        return;
      }
    }

    setPasting(false);
    setPasteToast("ok");
    setTimeout(() => setPasteToast("idle"), 2200);
    onSaved();
  };

  // ─── Schedule save ───────────────────────────────────────────────────────
  const save = async () => {
    if (isWorkingDay && timeStringToMinutes(endTime) <= timeStringToMinutes(startTime)) {
      setError("Конец рабочего дня должен быть позже начала.");
      return;
    }
    if (isWorkingDay) {
      for (const b of breaks) {
        if (timeStringToMinutes(b.end_time) <= timeStringToMinutes(b.start_time)) {
          setError("У каждого перерыва конец должен быть позже начала.");
          return;
        }
        if (
          timeStringToMinutes(b.start_time) < timeStringToMinutes(startTime) ||
          timeStringToMinutes(b.end_time) > timeStringToMinutes(endTime)
        ) {
          setError("Перерывы должны быть внутри рабочего дня.");
          return;
        }
      }
      const sortedBreaks = [...breaks].sort(
        (l, r) => timeStringToMinutes(l.start_time) - timeStringToMinutes(r.start_time)
      );
      for (let i = 0; i < sortedBreaks.length - 1; i++) {
        if (isBreakOverlap(sortedBreaks[i], sortedBreaks[i + 1])) {
          setError("Перерывы не должны пересекаться.");
          return;
        }
      }
    }

    setSaving(true);
    setError(null);

    const schedulePayload = {
      specialist_id: specialist.id,
      branch_id: branchId,
      schedule_date: baseSchedule.schedule_date,
      start_time: startTime,
      end_time: endTime,
      is_working_day: isWorkingDay
    };

    const { data: savedSchedule, error: scheduleError } = await supabase
      .from("day_schedules")
      .upsert(schedulePayload, { onConflict: "specialist_id,schedule_date,branch_id" })
      .select("*")
      .single();

    if (scheduleError) {
      setError(scheduleError.message);
      setSaving(false);
      return;
    }

    const scheduleId = savedSchedule.id as string;
    await supabase.from("schedule_breaks").delete().eq("day_schedule_id", scheduleId);

    if (isWorkingDay && breaks.length) {
      const { error: insertBreaksError } = await supabase.from("schedule_breaks").insert(
        breaks.map((b) => ({
          day_schedule_id: scheduleId,
          start_time: b.start_time,
          end_time: b.end_time
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

  // ─── Paste confirm dialog ────────────────────────────────────────────────
  if (showPasteConfirm && dayBuffer) {
    const srcLabel = formatRussianDate(new Date(dayBuffer.sourceDate), "d MMMM");
    const tgtLabel = formatRussianDate(selectedDate, "d MMMM");
    const aptCount = dayBuffer.appointments.length;
    return (
      <>
        <div className="fixed inset-0 z-40 bg-slate-950/30" onClick={() => setShowPasteConfirm(false)} />
        <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-4">
          <div className="w-full max-w-[430px] rounded-[32px] bg-card p-5 shadow-sheet">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200" />
            <h3 className="text-lg font-semibold text-ink">Заменить день?</h3>
            <p className="mt-2 text-sm text-muted">
              День <span className="font-medium text-ink">{tgtLabel}</span> будет полностью заменён копией{" "}
              <span className="font-medium text-ink">{srcLabel}</span>.
            </p>
            <div className="mt-3 space-y-1 rounded-2xl bg-slate-50 px-4 py-3 text-sm">
              <p className="text-muted">
                Записей в {tgtLabel} будет удалено: все
              </p>
              <p className="text-muted">
                Будет вставлено:{" "}
                <span className="font-semibold text-ink">
                  {aptCount === 0
                    ? "записей нет"
                    : `${aptCount} ${aptCount === 1 ? "запись" : aptCount < 5 ? "записи" : "записей"}`}
                </span>
              </p>
              <p className="text-muted">
                График:{" "}
                <span className="font-semibold text-ink">
                  {dayBuffer.schedule.is_working_day
                    ? `${dayBuffer.schedule.start_time.slice(0, 5)}–${dayBuffer.schedule.end_time.slice(0, 5)}`
                    : "нерабочий день"}
                </span>
              </p>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setShowPasteConfirm(false)}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-ink"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => { void executePaste(); }}
                disabled={pasting}
                className="rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {pasting ? "Вставляем..." : "Заменить"}
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ─── Main modal ───────────────────────────────────────────────────────────
  return (
    <>
      <div className="fixed inset-0 z-40 bg-slate-950/30" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-4">
        <div className="w-full max-w-[430px] rounded-[32px] bg-card p-5 shadow-sheet">
          <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200" />

          {/* Header row */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-lg font-semibold text-ink">Изменить график дня</h3>
              <p className="mt-1 truncate text-sm text-muted">
                {specialist.name}, {formatRussianDate(selectedDate)}
              </p>
            </div>

            {/* Action buttons: paste + copy */}
            <div className="flex shrink-0 items-center gap-2">
              {/* Paste button — visible only when buffer exists and not same day */}
              {hasBuffer && !bufferIsSameDay && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowPasteConfirm(true)}
                    title={`Вставить день из ${formatRussianDate(new Date(dayBuffer!.sourceDate), "d MMMM")}`}
                    aria-label="Вставить день"
                    className="relative flex h-9 w-9 items-center justify-center rounded-full border border-accent bg-accent/10 text-accent transition active:scale-95"
                  >
                    {/* Clipboard + arrow down */}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="9" y="2" width="6" height="4" rx="1" />
                      <path d="M9 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2h-2" />
                      <path d="M12 12v5m0 0-2-2m2 2 2-2" />
                    </svg>
                    {/* Blue dot indicator */}
                    <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-blue-500 ring-2 ring-white" />
                  </button>
                  {pasteToast !== "idle" && (
                    <span className={`absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold text-white ${
                      pasteToast === "ok" ? "bg-teal-600" : "bg-red-500"
                    }`}>
                      {pasteToast === "ok" ? "Вставлено ✓" : "Ошибка"}
                    </span>
                  )}
                </div>
              )}

              {/* Copy button */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => { void handleCopy(); }}
                  title="Скопировать записи дня"
                  aria-label="Скопировать записи дня в буфер"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-muted transition hover:border-accent hover:text-accent active:scale-95"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="9" y="2" width="6" height="4" rx="1" />
                    <path d="M9 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2h-2" />
                  </svg>
                  {copyToast !== "idle" && (
                    <span className={`absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold text-white ${
                      copyToast === "ok" ? "bg-teal-600" : "bg-red-500"
                    }`}>
                      {copyToast === "ok" ? "Скопировано ✓" : "Ошибка"}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Buffer hint */}
          {hasBuffer && !bufferIsSameDay && (
            <p className="mt-2 text-xs text-accent">
              Буфер: {formatRussianDate(new Date(dayBuffer!.sourceDate), "d MMMM")} — {dayBuffer!.appointments.length === 0 ? "записей нет" : `${dayBuffer!.appointments.length} ${dayBuffer!.appointments.length === 1 ? "запись" : dayBuffer!.appointments.length < 5 ? "записи" : "записей"}`}
            </p>
          )}

          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-ink">Начало рабочего дня</span>
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} disabled={!isWorkingDay}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-accent disabled:bg-slate-50" />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-ink">Конец рабочего дня</span>
              <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} disabled={!isWorkingDay}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-accent disabled:bg-slate-50" />
            </label>

            <button type="button" onClick={() => setIsWorkingDay((v) => !v)}
              className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-sm font-medium ${
                isWorkingDay ? "border-accent bg-accent/10 text-accent" : "border-slate-200 bg-slate-100 text-slate-600"
              }`}>
              <span>{isWorkingDay ? "Рабочий день" : "Сделать день нерабочим"}</span>
              <span>{isWorkingDay ? "Вкл" : "Выкл"}</span>
            </button>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-ink">Перерывы</p>
                  <p className="text-xs text-muted">Можно добавить несколько интервалов.</p>
                </div>
                <button type="button" onClick={() => setBreaks((c) => [...c, createEmptyBreak()])} disabled={!isWorkingDay}
                  className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-accent disabled:opacity-50">
                  Добавить
                </button>
              </div>
              <div className="mt-3 space-y-3">
                {breaks.map((b, i) => (
                  <div key={`${b.start_time}-${b.end_time}-${i}`} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                    <input type="time" value={b.start_time} disabled={!isWorkingDay}
                      onChange={(e) => setBreaks((c) => c.map((item, idx) => idx === i ? { ...item, start_time: e.target.value } : item))}
                      className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-accent disabled:bg-slate-50" />
                    <input type="time" value={b.end_time} disabled={!isWorkingDay}
                      onChange={(e) => setBreaks((c) => c.map((item, idx) => idx === i ? { ...item, end_time: e.target.value } : item))}
                      className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-accent disabled:bg-slate-50" />
                    <button type="button" onClick={() => setBreaks((c) => c.filter((_, idx) => idx !== i))}
                      className="rounded-2xl bg-white px-3 py-3 text-sm text-red-500">Удалить</button>
                  </div>
                ))}
                {!breaks.length && (
                  <div className="rounded-2xl bg-white px-4 py-4 text-sm text-muted">Перерывов пока нет.</div>
                )}
              </div>
            </div>
          </div>

          {error && <p className="mt-4 text-sm text-red-500">{error}</p>}

          <div className="mt-5 grid grid-cols-2 gap-3">
            <button type="button" onClick={onClose}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-ink">Отмена</button>
            <button type="button" onClick={() => { void save(); }} disabled={saving}
              className="rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">
              {saving ? "Сохраняем..." : "Сохранить"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
