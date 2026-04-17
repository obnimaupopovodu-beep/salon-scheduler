"use client";

import type { AppointmentWithRelations } from "@/types";
import { cn, getAppointmentLayout } from "@/lib/utils";

interface AppointmentBlockProps {
  appointment: AppointmentWithRelations;
  scheduleStartTime?: string;
  onClick: (appointment: AppointmentWithRelations) => void;
}

export function AppointmentBlock({
  appointment,
  scheduleStartTime,
  onClick
}: AppointmentBlockProps) {
  const { top, height } = getAppointmentLayout(appointment, scheduleStartTime);
  const displayHeight = Math.max(height, 48);
  const confirmed = appointment.confirmation === 1;

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick(appointment);
      }}
      className={cn(
        "absolute left-14 right-3 rounded-2xl border-l-4 px-3 py-2 text-left shadow-sm transition active:scale-[0.99]",
        confirmed ? "border-accent bg-appointment" : "border-amber-500 bg-amber-100"
      )}
      style={{ top, height: displayHeight }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="truncate text-sm font-semibold text-slate-900">
          {appointment.client_name || "Клиент"}
        </p>
        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
            confirmed ? "bg-white text-accent" : "bg-white text-amber-700"
          )}
        >
          {confirmed ? "Подтвердил" : "Ожидание"}
        </span>
      </div>
      <p className="mt-1 truncate text-xs text-slate-500">{appointment.client_phone || ""}</p>
    </button>
  );
}
