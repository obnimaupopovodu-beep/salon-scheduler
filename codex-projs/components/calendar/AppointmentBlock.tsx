"use client";

import type { AppointmentWithRelations } from "@/types";
import { cn, getAppointmentLayout } from "@/lib/utils";

interface AppointmentBlockProps {
  appointment: AppointmentWithRelations;
  onClick: (appointment: AppointmentWithRelations) => void;
}

export function AppointmentBlock({
  appointment,
  onClick
}: AppointmentBlockProps) {
  const { top, height } = getAppointmentLayout(appointment);
  const displayHeight = Math.max(height, 40);
  const showPhone = displayHeight >= 45;

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick(appointment);
      }}
      className={cn(
        "absolute left-14 right-3 rounded-2xl border-l-4 border-accent bg-appointment px-3 py-2 text-left shadow-sm transition active:scale-[0.99]"
      )}
      style={{ top, height: displayHeight }}
    >
      <p className="truncate text-sm font-semibold text-slate-900">
        {appointment.client_name || "Клиент"}
      </p>
      {showPhone ? (
        <p className="mt-1 truncate text-xs text-slate-500">
          {appointment.client_phone || ""}
        </p>
      ) : null}
    </button>
  );
}
