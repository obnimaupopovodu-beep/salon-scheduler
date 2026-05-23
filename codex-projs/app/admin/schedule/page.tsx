"use client";

import { addDays, isSameDay, subDays } from "date-fns";
import { useEffect, useMemo, useState } from "react";

import { TimeGrid } from "@/components/calendar/TimeGrid";
import { WeekSwitcher } from "@/components/calendar/WeekSwitcher";
import { MonthCalendarSheet } from "@/components/calendar/MonthCalendarSheet";
import { AppointmentModal } from "@/components/modals/AppointmentModal";
import { DayScheduleModal } from "@/components/modals/DayScheduleModal";
import { useAppointments } from "@/hooks/useAppointments";
import { useBranches } from "@/hooks/useBranches";
import { useDayBuffer } from "@/hooks/useDayBuffer";
import { useDaySchedules } from "@/hooks/useDaySchedules";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useServices } from "@/hooks/useServices";
import { useSpecialists } from "@/hooks/useSpecialists";
import { formatDateKey, formatRussianDate, getDefaultDaySchedule } from "@/lib/utils";
import type { AppointmentWithRelations } from "@/types";

export default function AdminSchedulePage() {
  const isOnline = useOnlineStatus();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeBranchId, setActiveBranchId] = useState<string>("");
  const [activeSpecialistId, setActiveSpecialistId] = useState<string>("");
  const [monthSheetOpen, setMonthSheetOpen] = useState(false);
  const { branches, loading: branchesLoading } = useBranches();
  const { specialists, loading: specialistsLoading } = useSpecialists();
  const { groupedServices, loading: servicesLoading, refetch: refetchServices } = useServices();
  const [modalOpen, setModalOpen] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [modalDate, setModalDate] = useState(new Date());
  const [editingAppointment, setEditingAppointment] =
    useState<AppointmentWithRelations | null>(null);

  const { buffer: dayBuffer, copy: copyDayToBuffer } = useDayBuffer();

  useEffect(() => {
    if (!activeBranchId && branches[0]) setActiveBranchId(branches[0].id);
  }, [activeBranchId, branches]);

  useEffect(() => {
    if (!specialists.length) {
      if (activeSpecialistId) setActiveSpecialistId("");
      return;
    }
    if (!specialists.some((s) => s.id === activeSpecialistId)) {
      setActiveSpecialistId(specialists[0].id);
    }
  }, [activeSpecialistId, specialists]);

  useEffect(() => {
    setModalOpen(false);
    setScheduleModalOpen(false);
    setEditingAppointment(null);
  }, [activeBranchId]);

  const selectedSpecialist = useMemo(
    () => specialists.find((s) => s.id === activeSpecialistId),
    [activeSpecialistId, specialists]
  );

  const { appointments, loading: appointmentsLoading, refetch } = useAppointments({
    specialistId: activeSpecialistId,
    branchId: activeBranchId,
    date: selectedDate
  });

  const { loading: schedulesLoading, refetch: refetchSchedules, getScheduleForDate } = useDaySchedules({
    specialistId: activeSpecialistId,
    branchId: activeBranchId,
    date: selectedDate
  });

  const { schedules: monthSchedules } = useDaySchedules({
    specialistId: activeSpecialistId,
    branchId: activeBranchId,
    date: selectedDate,
    mode: "month"
  });

  const currentSchedule = selectedSpecialist
    ? getScheduleForDate(selectedDate)
    : getDefaultDaySchedule(selectedDate, "", activeBranchId);

  const openCreateModal = (date: Date) => {
    setModalDate(date);
    setEditingAppointment(null);
    setModalOpen(true);
  };

  const openEditModal = (appointment: AppointmentWithRelations) => {
    setEditingAppointment(appointment);
    setModalDate(new Date(appointment.start_time));
    setModalOpen(true);
  };

  return (
    <div className="space-y-4">
      {!isOnline && (
        <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Нет подключения к интернету. Последние данные могут быть устаревшими.
        </div>
      )}

      <header className="flex items-center justify-between rounded-[28px] bg-white px-4 py-4 shadow-sm">
        <button type="button" onClick={() => setMonthSheetOpen(true)}
          className="group text-left" aria-label="Открыть календарь месяца">
          <p className="text-sm text-muted">Дата</p>
          <h1 className="text-2xl font-semibold capitalize text-ink underline-offset-4 group-hover:underline">
            {formatRussianDate(selectedDate)}
          </h1>
        </button>

        <div className="flex flex-col items-end gap-3">
          <button type="button"
            onClick={() => { const t = new Date(); if (!isSameDay(selectedDate, t)) setSelectedDate(t); }}
            className="rounded-full border border-blue-600 px-3 py-1 text-sm text-blue-600">
            Сегодня
          </button>
          <label className="flex min-w-[150px] flex-col">
            <span className="mb-1 text-right text-xs font-medium uppercase tracking-wide text-muted">Филиал</span>
            <select value={activeBranchId} onChange={(e) => setActiveBranchId(e.target.value)}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-ink outline-none focus:border-accent">
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </label>
          <label className="flex min-w-[150px] flex-col">
            <span className="mb-1 text-right text-xs font-medium uppercase tracking-wide text-muted">Специалист</span>
            <select value={activeSpecialistId} onChange={(e) => setActiveSpecialistId(e.target.value)}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-ink outline-none focus:border-accent">
              {specialists.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
        </div>
      </header>

      {/* Schedule button — shows buffer indicator dot if buffer is active */}
      <button type="button" onClick={() => setScheduleModalOpen(true)} disabled={!selectedSpecialist}
        className="relative w-full rounded-[28px] bg-white px-4 py-4 text-left shadow-sm disabled:opacity-60">
        <span className="block text-sm font-semibold text-ink">Изменить график дня</span>
        <span className="mt-1 block text-sm text-muted">
          {currentSchedule.is_working_day
            ? `${currentSchedule.start_time.slice(0, 5)} - ${currentSchedule.end_time.slice(0, 5)}, перерывов: ${currentSchedule.breaks.length}`
            : "День отмечен как нерабочий"}
        </span>
        {dayBuffer && dayBuffer.sourceDate !== formatDateKey(selectedDate) && (
          <span className="absolute right-4 top-4 flex items-center gap-1.5 text-xs font-medium text-accent">
            <span className="h-2 w-2 rounded-full bg-accent" />
            Буфер заполнен
          </span>
        )}
      </button>

      {branchesLoading || specialistsLoading || servicesLoading || appointmentsLoading || schedulesLoading ? (
        <div className="space-y-3 animate-pulse">
          <div className="h-20 rounded-[28px] bg-white" />
          <div className="h-[520px] rounded-[28px] bg-white" />
        </div>
      ) : (
        <>
          <TimeGrid selectedDate={selectedDate} appointments={appointments}
            schedule={currentSchedule} onSelectTime={openCreateModal} onSelectAppointment={openEditModal} />
          <div className="sticky bottom-20">
            <WeekSwitcher selectedDate={selectedDate} onSelectDate={setSelectedDate}
              onPreviousWeek={() => setSelectedDate((d) => subDays(d, 7))}
              onNextWeek={() => setSelectedDate((d) => addDays(d, 7))} />
          </div>
        </>
      )}

      <MonthCalendarSheet open={monthSheetOpen} selectedDate={selectedDate}
        schedules={monthSchedules}
        onSelectDate={(day) => { setSelectedDate(day); setMonthSheetOpen(false); }}
        onClose={() => setMonthSheetOpen(false)} />

      <AppointmentModal open={modalOpen} mode={editingAppointment ? "edit" : "create"}
        selectedDate={modalDate} selectedSpecialistId={selectedSpecialist?.id}
        branchId={activeBranchId} specialists={specialists} serviceGroups={groupedServices}
        appointment={editingAppointment} onClose={() => setModalOpen(false)}
        onSaved={() => { void refetch(); void refetchServices(); }} />

      <DayScheduleModal
        open={scheduleModalOpen}
        selectedDate={selectedDate}
        branchId={activeBranchId}
        specialist={selectedSpecialist}
        schedule={currentSchedule}
        appointments={appointments}
        dayBuffer={dayBuffer}
        onClose={() => setScheduleModalOpen(false)}
        onSaved={() => { void refetchSchedules(); void refetch(); }}
        onCopyDay={() =>
          copyDayToBuffer(
            formatDateKey(selectedDate),
            activeSpecialistId,
            activeBranchId,
            currentSchedule,
            appointments
          )
        }
      />
    </div>
  );
}
