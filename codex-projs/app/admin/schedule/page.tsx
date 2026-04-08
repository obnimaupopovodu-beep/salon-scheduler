"use client";

import { addDays, isSameDay, subDays } from "date-fns";
import { useEffect, useMemo, useState } from "react";

import { TimeGrid } from "@/components/calendar/TimeGrid";
import { WeekSwitcher } from "@/components/calendar/WeekSwitcher";
import { AppointmentModal } from "@/components/modals/AppointmentModal";
import { useAppointments } from "@/hooks/useAppointments";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useServices } from "@/hooks/useServices";
import { useSpecialists } from "@/hooks/useSpecialists";
import { formatRussianDate } from "@/lib/utils";
import type { AppointmentWithRelations } from "@/types";

export default function AdminSchedulePage() {
  const isOnline = useOnlineStatus();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const { specialists, loading: specialistsLoading } = useSpecialists();
  const { groupedServices, loading: servicesLoading, refetch: refetchServices } = useServices();
  const [activeSpecialistId, setActiveSpecialistId] = useState<string>("");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDate, setModalDate] = useState(new Date());
  const [editingAppointment, setEditingAppointment] =
    useState<AppointmentWithRelations | null>(null);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  useEffect(() => {
    if (!activeSpecialistId && specialists[0]?.id) {
      setActiveSpecialistId(specialists[0].id);
    }
  }, [activeSpecialistId, specialists]);

  const selectedSpecialist = useMemo(
    () => specialists.find((specialist) => specialist.id === activeSpecialistId),
    [activeSpecialistId, specialists]
  );

  const { appointments, loading: appointmentsLoading, refetch } = useAppointments({
    specialistId: activeSpecialistId,
    date: selectedDate
  });

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
    <div
      className="space-y-4"
      onTouchStart={(event) => setTouchStartX(event.changedTouches[0]?.clientX ?? null)}
      onTouchEnd={(event) => {
        const endX = event.changedTouches[0]?.clientX;
        if (touchStartX === null || typeof endX !== "number") {
          return;
        }

        const delta = endX - touchStartX;
        if (delta > 40) {
          setSelectedDate((current) => subDays(current, 7));
        }
        if (delta < -40) {
          setSelectedDate((current) => addDays(current, 7));
        }
      }}
    >
      {!isOnline ? (
        <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Нет подключения к интернету. Последние данные могут быть устаревшими.
        </div>
      ) : null}

      <header className="flex items-center justify-between rounded-[28px] bg-white px-4 py-4 shadow-sm">
        <div>
          <p className="text-sm text-muted">Дата</p>
          <h1 className="text-2xl font-semibold capitalize text-ink">
            {formatRussianDate(selectedDate)}
          </h1>
        </div>

        <div className="flex items-end gap-3">
          <button
            type="button"
            onClick={() => {
              const today = new Date();
              if (!isSameDay(selectedDate, today)) {
                setSelectedDate(today);
              }
            }}
            className="rounded-full border border-blue-600 px-3 py-1 text-sm text-blue-600"
          >
            Сегодня
          </button>

          <label className="flex min-w-[150px] flex-col">
            <span className="mb-1 text-right text-xs font-medium uppercase tracking-wide text-muted">
              Специалист
            </span>
            <select
              value={activeSpecialistId}
              onChange={(event) => setActiveSpecialistId(event.target.value)}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-ink outline-none focus:border-accent"
            >
              {specialists.map((specialist) => (
                <option key={specialist.id} value={specialist.id}>
                  {specialist.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      {specialistsLoading || servicesLoading || appointmentsLoading ? (
        <div className="space-y-3 animate-pulse">
          <div className="h-20 rounded-[28px] bg-white" />
          <div className="h-[520px] rounded-[28px] bg-white" />
        </div>
      ) : (
        <>
          <TimeGrid
            selectedDate={selectedDate}
            appointments={appointments}
            onSelectTime={openCreateModal}
            onSelectAppointment={openEditModal}
          />
          <div className="sticky bottom-20">
            <WeekSwitcher selectedDate={selectedDate} onSelectDate={setSelectedDate} />
          </div>
        </>
      )}

      <AppointmentModal
        open={modalOpen}
        mode={editingAppointment ? "edit" : "create"}
        selectedDate={modalDate}
        selectedSpecialistId={selectedSpecialist?.id}
        specialists={specialists}
        serviceGroups={groupedServices}
        appointment={editingAppointment}
        onClose={() => setModalOpen(false)}
        onSaved={() => {
          void refetch();
          void refetchServices();
        }}
      />
    </div>
  );
}
