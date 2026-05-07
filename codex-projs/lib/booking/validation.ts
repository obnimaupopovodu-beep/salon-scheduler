import { startOfDay } from "date-fns";

export function isPastBookingDay(date: Date) {
  return startOfDay(date) < startOfDay(new Date());
}

export function isPastBookingTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return true;
  }

  return date.getTime() < Date.now();
}
