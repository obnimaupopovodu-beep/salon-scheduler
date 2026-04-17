"use client";

import { addDays, format, isSameDay, subDays } from "date-fns";
import { useEffect, useMemo, useState } from "react";

import { WeekSwitcher } from "@/components/calendar/WeekSwitcher";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { useAppointments } from "@/hooks/useAppointments";
import { useDaySchedules } from "@/hooks/useDaySchedules";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useServices } from "@/hooks/useServices";
import { useSpecialists } from "@/hooks/useSpecialists";
import {
  formatRussianDate,
  generateAvailableSlots,
  isValidRussianPhone,
  normalizePhone
} from "@/lib/utils";

export function BookingWizard() {
  const supabase = useSupabase();
  const isOnline = useOnlineStatus();
  const { specialists, loading: specialistsLoading } = useSpecialists();
  const { groupedServices, services, loading: servicesLoading } = useServices();
  const [step, setStep] = useState(1);
  const [specialistId, setSpecialistId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("+7");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const selectedService = services.find((service) => service.id === serviceId);
  const selectedSpecialist = specialists.find((specialist) => specialist.id === specialistId);
  const { appointments, loading: appointmentsLoading } = useAppointments({
    specialistId,
    date: selectedDate,
    mode: "week"
  });
  const { loading: schedulesLoading, getScheduleForDate } = useDaySchedules({
    specialistId,
    date: selectedDate,
    mode: "week"
  });
  const selectedDaySchedule = getScheduleForDate(selectedDate);

  useEffect(() => {
    setSelectedTime(null);
  }, [selectedDate, serviceId, specialistId]);

  const slotsForDay = useMemo(() => {
    if (!selectedService || !specialistId) {
      return [];
    }

    const dayAppointments = appointments.filter((appointment) =>
      isSameDay(new Date(appointment.start_time), selectedDate)
    );

    return generateAvailableSlots(
      selectedDate,
      selectedService.duration_minutes,
      dayAppointments,
      selectedDaySchedule
    );
  }, [appointments, selectedDate, selectedDaySchedule, selectedService, specialistId]);

  const createBooking = async () => {
    if (!selectedService || !selectedSpecialist || !selectedTime || !name.trim()) {
      setError("Заполните все обязательные поля.");
      return;
    }

    if (!isValidRussianPhone(phone)) {
      setError("Введите телефон в формате +7XXXXXXXXXX.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const start = new Date(selectedTime);
    const end = new Date(start.getTime() + selectedService.duration_minutes * 60000);
    const { error: insertError } = await supabase.from("appointments").insert({
      specialist_id: selectedSpecialist.id,
      service_id: selectedService.id,
      client_name: name.trim(),
      client_phone: normalizePhone(phone),
      confirmation: 0,
      start_time: start.toISOString(),
      end_time: end.toISOString()
    });

    if (insertError) {
      setError(insertError.message);
      setSubmitting(false);
      return;
    }

    setSuccess(
      `Вы записаны! ${selectedService.name} ${formatRussianDate(start, "dd MMMM")} ${format(
        start,
        "HH:mm"
      )} с ${selectedSpecialist.name}`
    );
    setSubmitting(false);
  };

  if (success) {
    return (
      <div className="rounded-[32px] bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-accent">Готово</p>
        <h2 className="mt-2 text-2xl font-semibold text-ink">{success}</h2>
      </div>
    );
  }

  return (
    <div className="rounded-[32px] bg-white p-5 shadow-sm">
      {!isOnline ? (
        <div className="mb-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Нет подключения к интернету. Данные могут не обновляться.
        </div>
      ) : null}

      <div className="mb-6 flex items-center gap-2">
        {[1, 2, 3].map((item) => (
          <div
            key={item}
            className={`h-2 flex-1 rounded-full ${item <= step ? "bg-accent" : "bg-slate-200"}`}
          />
        ))}
      </div>

      {(specialistsLoading || servicesLoading) && step === 1 ? (
        <div className="space-y-3 animate-pulse">
          <div className="h-14 rounded-2xl bg-slate-100" />
          <div className="h-14 rounded-2xl bg-slate-100" />
        </div>
      ) : null}

      {step === 1 ? (
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-ink">Выберите специалиста</span>
            <select
              value={specialistId}
              onChange={(event) => setSpecialistId(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-accent"
            >
              <option value="">Выберите специалиста</option>
              {specialists.map((specialist) => (
                <option key={specialist.id} value={specialist.id}>
                  {specialist.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-ink">Выберите услугу</span>
            <select
              value={serviceId}
              onChange={(event) => setServiceId(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-accent"
            >
              <option value="">Выберите услугу</option>
              {groupedServices.map((group) => (
                <optgroup key={group.category.id} label={group.category.name}>
                  {group.services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name} ({service.duration_minutes} мин - {service.price} ₽)
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={() => {
              if (specialistId && serviceId) {
                setStep(2);
                setError(null);
              } else {
                setError("Сначала выберите специалиста и услугу.");
              }
            }}
            className="w-full rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white"
          >
            Далее
          </button>
        </div>
      ) : null}

      {step === 2 ? (
        <div>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-ink">Выберите дату и время</h2>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="text-sm font-medium text-muted"
            >
              Назад
            </button>
          </div>

          <div className="mt-4">
            <WeekSwitcher
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              onPreviousWeek={() => setSelectedDate((current) => subDays(current, 7))}
              onNextWeek={() => setSelectedDate((current) => addDays(current, 7))}
            />
          </div>

          {appointmentsLoading || schedulesLoading ? (
            <div className="mt-4 grid grid-cols-2 gap-3 animate-pulse">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="h-12 rounded-2xl bg-slate-100" />
              ))}
            </div>
          ) : !selectedDaySchedule.is_working_day ? (
            <div className="mt-4 rounded-2xl bg-canvas px-4 py-6 text-center text-sm text-muted">
              На выбранный день запись недоступна. Специалист не работает.
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-3">
              {slotsForDay.map((slot) => {
                const value = slot.toISOString();
                const active = selectedTime === value;

                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setSelectedTime(value)}
                    className={`rounded-2xl border px-4 py-3 text-sm font-medium ${
                      active
                        ? "border-accent bg-accent text-white"
                        : "border-slate-200 text-ink"
                    }`}
                  >
                    {format(slot, "HH:mm")}
                  </button>
                );
              })}

              {!slotsForDay.length ? (
                <p className="col-span-2 rounded-2xl bg-canvas px-4 py-6 text-center text-sm text-muted">
                  Нет свободных слотов на выбранный день.
                </p>
              ) : null}
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              if (selectedTime) {
                setStep(3);
                setError(null);
              } else {
                setError("Выберите свободный слот.");
              }
            }}
            className="mt-5 w-full rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white"
          >
            Далее
          </button>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-ink">Контактные данные</h2>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-ink">Имя</span>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-accent"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-ink">Телефон</span>
            <input
              type="tel"
              value={phone}
              onChange={(event) => setPhone(normalizePhone(event.target.value))}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-accent"
            />
          </label>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-ink"
            >
              Назад
            </button>
            <button
              type="button"
              onClick={() => {
                void createBooking();
              }}
              disabled={submitting}
              className="flex-1 rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {submitting ? "Отправляем..." : "Записаться"}
            </button>
          </div>
        </div>
      ) : null}

      {error ? <p className="mt-4 text-sm text-red-500">{error}</p> : null}
    </div>
  );
}
