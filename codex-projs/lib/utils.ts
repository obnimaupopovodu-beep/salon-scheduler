import {
  addDays,
  addMinutes,
  endOfDay,
  endOfWeek,
  format,
  isSameDay,
  parse,
  set,
  startOfDay,
  startOfWeek
} from "date-fns";
import { ru } from "date-fns/locale";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import type { Appointment, Service, ServiceCategory, ServiceGroup } from "@/types";

export const BUSINESS_START_HOUR = 9;
export const BUSINESS_END_HOUR = 21;
export const GRID_ROW_HEIGHT = 72;

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRussianDate(date: Date, pattern = "dd MMMM") {
  return format(date, pattern, { locale: ru });
}

export function getWeekDays(date: Date) {
  const start = startOfWeek(date, { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

export function getWeekRange(date: Date) {
  return {
    start: startOfWeek(date, { weekStartsOn: 1 }),
    end: endOfWeek(date, { weekStartsOn: 1 })
  };
}

export function getDayRange(date: Date) {
  return {
    start: startOfDay(date),
    end: endOfDay(date)
  };
}

export function timeStringToDate(baseDate: Date, time: string) {
  const parsed = parse(time, "HH:mm", baseDate);
  return set(baseDate, {
    hours: parsed.getHours(),
    minutes: parsed.getMinutes(),
    seconds: 0,
    milliseconds: 0
  });
}

export function getInitialTimeFromDate(date: Date) {
  return format(date, "HH:mm");
}

export function normalizePhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  const local = digits.startsWith("7") ? digits.slice(1) : digits;
  return `+7${local.slice(0, 10)}`;
}

export function isValidRussianPhone(phone: string) {
  return /^\+7\d{10}$/.test(normalizePhone(phone));
}

export function buildServiceGroups(categories: ServiceCategory[], services: Service[]): ServiceGroup[] {
  return categories.map((category) => ({
    category,
    services: services.filter((service) => service.category_id === category.id)
  }));
}

export function getAppointmentLayout(appointment: Appointment) {
  const start = new Date(appointment.start_time);
  const end = new Date(appointment.end_time);
  const minutesFromStart =
    (start.getHours() - BUSINESS_START_HOUR) * 60 + start.getMinutes();
  const duration = (end.getTime() - start.getTime()) / 60000;

  return {
    top: (minutesFromStart / 60) * GRID_ROW_HEIGHT,
    height: (duration / 60) * GRID_ROW_HEIGHT
  };
}

export function generateAvailableSlots(
  date: Date,
  durationMinutes: number,
  appointments: Appointment[],
  interval = 30
) {
  const slots: Date[] = [];
  const dayStart = set(date, {
    hours: BUSINESS_START_HOUR,
    minutes: 0,
    seconds: 0,
    milliseconds: 0
  });
  const dayEnd = set(date, {
    hours: BUSINESS_END_HOUR,
    minutes: 0,
    seconds: 0,
    milliseconds: 0
  });

  for (
    let cursor = dayStart;
    addMinutes(cursor, durationMinutes) <= dayEnd;
    cursor = addMinutes(cursor, interval)
  ) {
    const slotEnd = addMinutes(cursor, durationMinutes);
    const overlaps = appointments.some((appointment) => {
      const appointmentStart = new Date(appointment.start_time);
      const appointmentEnd = new Date(appointment.end_time);
      return cursor < appointmentEnd && slotEnd > appointmentStart;
    });

    if (!overlaps) {
      slots.push(cursor);
    }
  }

  return slots;
}

export function isToday(date: Date) {
  return isSameDay(date, new Date());
}
