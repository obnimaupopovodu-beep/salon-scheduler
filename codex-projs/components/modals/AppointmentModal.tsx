"use client";

import { useEffect, useMemo, useState } from "react";

import { ConfirmModal } from "@/components/modals/ConfirmModal";
import { ClientAutocomplete } from "@/components/modals/ClientAutocomplete";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import {
  getInitialTimeFromDate,
  isValidRussianPhone,
  normalizePhone,
  timeStringToDate
} from "@/lib/utils";
import type {
  AppointmentPayload,
  AppointmentWithRelations,
  ServiceGroup,
  Specialist
} from "@/types";

interface AppointmentModalProps {
  open: boolean;
  mode: "create" | "edit";
  selectedDate: Date;
  selectedSpecialistId?: string;
  branchId: string;
  specialists: Specialist[];
  serviceGroups: ServiceGroup[];
  appointment?: AppointmentWithRelations | null;
  onClose: () => void;
  onSaved: () => void;
}

export function AppointmentModal({
  open,
  mode,
  selectedDate,
  selectedSpecialistId,
  branchId,
  specialists,
  serviceGroups,
  appointment,
  onClose,
  onSaved
}: AppointmentModalProps) {
  const supabase = useSupabase();
  const [time, setTime] = useState(getInitialTimeFromDate(selectedDate));
  const [specialistId, setSpecialistId] = useState(selectedSpecialistId ?? "");
  const [serviceId, setServiceId] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("+7");
  const [confirmation, setConfirmation] = useState<0 | 1>(0);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const flatServices = useMemo(
    () => serviceGroups.flatMap((group) => group.services),
    [serviceGroups]
  );

  useEffect(() => {
    if (appointment) {
      setTime(getInitialTimeFromDate(new Date(appointment.start_time)));
      setSpecialistId(appointment.specialist_id);
      setServiceId(appointment.service_id ?? "");
      setClientName(appointment.client_name);
      setClientPhone(appointment.client_phone);
      setConfirmation(appointment.confirmation ?? 0);
      setNotes(appointment.notes ?? "");
    } else {
      setTime(getInitialTimeFromDate(selectedDate));
      setSpecialistId(selectedSpecialistId ?? specialists[0]?.id ?? "");
      setServiceId(serviceGroups[0]?.services[0]?.id ?? "");
      setClientName("");
      setClientPhone("+7");
      setConfirmation(0);
      setNotes("");
    }

    setError(null);
  }, [appointment, selectedDate, selectedSpecialistId, serviceGroups, specialists]);

  if (!open) {
    return null;
  }

  const submit = async () => {
    if (!time || !specialistId || !serviceId || !clientName.trim()) {
      setError("Заполните обязательные поля.");
      return;
    }

    if (!isValidRussianPhone(clientPhone)) {
      setError("Введите телефон в формате +7XXXXXXXXXX.");
      return;
    }

    const service = flatServices.find((item) => item.id === serviceId);
    if (!service) {
      setError("Выберите услугу.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const startDate = timeStringToDate(selectedDate, time);
    const endDate = new Date(startDate.getTime() + service.duration_minutes * 60000);
    const normalizedPhone = normalizePhone(clientPhone);
    const payload: AppointmentPayload = {
      specialist_id: specialistId,
      branch_id: branchId,
      service_id: serviceId,
      client_name: clientName.trim(),
      client_phone: normalizedPhone,
      confirmation,
      start_time: startDate.toISOString(),
      end_time: endDate.toISOString(),
      notes: notes.trim() || undefined
    };

    const query =
      mode === "edit" && appointment
        ? supabase.from("appointments").update(payload).eq("id", appointment.id)
        : supabase.from("appointments").insert(payload);

    const { error: queryError } = await query;

    if (queryError) {
      setError(queryError.message);
      setSubmitting(false);
      return;
    }

    if (mode === "create") {
      const { data: existingClient, error: existingClientError } = await supabase
        .from("clients")
        .select("id")
        .eq("phone", normalizedPhone)
        .maybeSingle();

      if (!existingClientError && !existingClient) {
        await supabase.from("clients").insert({ name: clientName.trim(), phone: normalizedPhone });
      }
    }

    setSubmitting(false);
    onSaved();
    onClose();
  };

  const remove = async () => {
    if (!appointment) {
      return;
    }

    setSubmitting(true);
    const { error: deleteError } = await supabase
      .from("appointments")
      .delete()
      .eq("id", appointment.id);

    if (deleteError) {
      setError(deleteError.message);
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    setShowDeleteConfirm(false);
    onSaved();
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-slate-950/30" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-4">
        <div className="w-full max-w-[430px] rounded-[32px] bg-card p-5 shadow-sheet transition">
          <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200" />
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold text-ink">
              {mode === "create" ? "Новая запись" : "Редактировать запись"}
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100"
              aria-label="Закрыть"
            >
              <span className="text-[16px] leading-none text-muted">×</span>
            </button>
          </div>

          <div className="mt-4">
            <p className="mb-2 text-sm font-medium text-ink">Статус записи</p>
            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setConfirmation(0)}
                className={`rounded-2xl px-3 py-2 text-sm font-semibold transition ${
                  confirmation === 0 ? "bg-white text-amber-700 shadow-sm" : "text-muted"
                }`}
              >
                Ожидание
              </button>
              <button
                type="button"
                onClick={() => setConfirmation(1)}
                className={`rounded-2xl px-3 py-2 text-sm font-semibold transition ${
                  confirmation === 1 ? "bg-white text-accent shadow-sm" : "text-muted"
                }`}
              >
                Подтвердил
              </button>
            </div>
          </div>

          <div className="mt-4 space-y-4">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-ink">Время</span>
              <input
                type="time"
                value={time}
                onChange={(event) => setTime(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-accent"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-ink">Специалист</span>
              <select
                value={specialistId}
                onChange={(event) => setSpecialistId(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-accent"
              >
                {specialists.map((specialist) => (
                  <option key={specialist.id} value={specialist.id}>
                    {specialist.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-ink">Услуга</span>
              <select
                value={serviceId}
                onChange={(event) => setServiceId(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-accent"
              >
                {serviceGroups.map((group) => (
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

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-ink">Имя клиента</span>
              <ClientAutocomplete
                value={clientName}
                onChange={setClientName}
                onSelectClient={(client) => {
                  setClientName(client.name);
                  setClientPhone(normalizePhone(client.phone));
                }}
                placeholder="Анна"
                disabled={submitting}
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-ink">Телефон клиента</span>
              <input
                type="tel"
                value={clientPhone}
                onChange={(event) => setClientPhone(normalizePhone(event.target.value))}
                placeholder="+79991234567"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-accent"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-ink">Заметка</span>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-accent"
              />
            </label>
          </div>

          {error ? <p className="mt-3 text-sm text-red-500">{error}</p> : null}

          <button
            type="button"
            onClick={() => {
              void submit();
            }}
            disabled={submitting}
            className="mt-5 w-full rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {submitting ? "Сохраняем..." : "Сохранить"}
          </button>

          {mode === "edit" ? (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="mt-3 w-full rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-500"
            >
              Удалить запись
            </button>
          ) : null}
        </div>
      </div>

      <ConfirmModal
        open={showDeleteConfirm}
        title="Удалить запись?"
        description="Это действие нельзя отменить."
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={() => {
          void remove();
        }}
      />
    </>
  );
}
