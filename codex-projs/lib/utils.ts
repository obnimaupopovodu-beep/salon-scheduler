import {
  addDays,
  addMinutes,
  differenceInMinutes,
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

import type {
  Appointment,
  DayScheduleWithBreaks,
  ScheduleBreak,
  Service,
  ServiceCategory,
  ServiceGroup
} from "@/types";

export const DEFAULT_DAY_START_TIME = "09:00";
export const DEFAULT_DAY_END_TIME = "21:00";
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

export function formatDateKey(date: Date) {
  return format(date, "yyyy-MM-dd");
}

export function timeStringToDate(baseDate: Date, time: string) {
  const [rawHours, rawMinutes] = time.split(":");
  const normalizedTime = rawHours && rawMinutes
    ? `${rawHours.padStart(2, "0")}:${rawMinutes.padStart(2, "0")}`
    : time;
  const parsed = parse(normalizedTime, "HH:mm", baseDate);
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
  // Оставляем + в начале, убираем пробелы, скобки, тире
  const cleaned = phone.replace(/[^\d+]/g, "");
  // Гарантируем + в начале если есть цифры
  if (!cleaned.startsWith("+") && cleaned.length > 0) {
    return "+" + cleaned;
  }
  return cleaned;
}

export function isValidPhone(phone: string) {
  // Минимум 7 цифр, максимум 15 (стандарт E.164)
  return /^\+\d{7,15}$/.test(normalizePhone(phone));
}

export function buildServiceGroups(categories: ServiceCategory[], services: Service[]): ServiceGroup[] {
  return categories.map((category) => ({
    category,
    services: services.filter((service) => service.category_id === category.id)
  }));
}

export function timeStringToMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function minutesToTimeString(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60)
    .toString()
    .padStart(2, "0");
  const minutes = (totalMinutes % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function getDefaultDaySchedule(
  date: Date,
  specialistId = "",
  branchId?: string
): DayScheduleWithBreaks {
  return {
    specialist_id: specialistId,
    branch_id: branchId,
    schedule_date: formatDateKey(date),
    start_time: DEFAULT_DAY_START_TIME,
    end_time: DEFAULT_DAY_END_TIME,
    is_working_day: false,
    breaks: []
  };
}

export function getAppointmentLayout(
  appointment: Appointment,
  scheduleStartTime = DEFAULT_DAY_START_TIME
) {
  const start = new Date(appointment.start_time);
  const end = new Date(appointment.end_time);
  const dayStartMinutes = timeStringToMinutes(scheduleStartTime);
  const appointmentStartMinutes = start.getHours() * 60 + start.getMinutes();
  const minutesFromStart = appointmentStartMinutes - dayStartMinutes;
  const duration = differenceInMinutes(end, start);

  return {
    top: (minutesFromStart / 60) * GRID_ROW_HEIGHT,
    height: (duration / 60) * GRID_ROW_HEIGHT
  };
}

export function isBreakOverlap(a: ScheduleBreak, b: ScheduleBreak) {
  return timeStringToMinutes(a.start_time) < timeStringToMinutes(b.end_time)
    && timeStringToMinutes(a.end_time) > timeStringToMinutes(b.start_time);
}

export function generateAvailableSlots(
  date: Date,
  durationMinutes: number,
  appointments: Appointment[],
  schedule?: DayScheduleWithBreaks,
  interval = 30
) {
  const slots: Date[] = [];
  const activeSchedule = schedule ?? getDefaultDaySchedule(date);

  if (!activeSchedule.is_working_day) {
    return slots;
  }

  const dayStart = timeStringToDate(date, activeSchedule.start_time);
  const dayEnd = timeStringToDate(date, activeSchedule.end_time);

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

    const overlapsBreak = activeSchedule.breaks.some((scheduleBreak) => {
      const breakStart = timeStringToDate(date, scheduleBreak.start_time);
      const breakEnd = timeStringToDate(date, scheduleBreak.end_time);
      return cursor < breakEnd && slotEnd > breakStart;
    });

    if (!overlaps && !overlapsBreak) {
      slots.push(cursor);
    }
  }

  return slots;
}

export function isToday(date: Date) {
  return isSameDay(date, new Date());
}
