"use client";

import { format, isSameDay, set } from "date-fns";
import { useEffect, useMemo, useRef, useState } from "react";

import { AppointmentBlock } from "@/components/calendar/AppointmentBlock";
import { BUSINESS_END_HOUR, BUSINESS_START_HOUR, GRID_ROW_HEIGHT } from "@/lib/utils";
import type { AppointmentWithRelations } from "@/types";

interface TimeGridProps {
  selectedDate: Date;
  appointments: AppointmentWithRelations[];
  onSelectTime: (date: Date) => void;
  onSelectAppointment: (appointment: AppointmentWithRelations) => void;
}

export function TimeGrid({
  selectedDate,
  appointments,
  onSelectTime,
  onSelectAppointment
}: TimeGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const hasAutoScrolledRef = useRef(false);
  const [indicatorTop, setIndicatorTop] = useState<number>(-1);
  const hours = useMemo(
    () =>
      Array.from(
        { length: BUSINESS_END_HOUR - BUSINESS_START_HOUR + 1 },
        (_, index) => BUSINESS_START_HOUR + index
      ),
    []
  );

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();

      const beforeStart = currentHour < BUSINESS_START_HOUR;
      const afterEnd = currentHour > BUSINESS_END_HOUR || (currentHour === BUSINESS_END_HOUR && currentMinute > 0);
      if (beforeStart || afterEnd) {
        setIndicatorTop(-1);
        return;
      }

      const offsetHours = currentHour - BUSINESS_START_HOUR + currentMinute / 60;
      setIndicatorTop(offsetHours * GRID_ROW_HEIGHT);
    };

    update();
    const interval = window.setInterval(update, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const showIndicator = useMemo(() => {
    if (!isSameDay(selectedDate, new Date())) {
      return false;
    }
    if (indicatorTop < 0) {
      return false;
    }
    const maxTop = (BUSINESS_END_HOUR - BUSINESS_START_HOUR) * GRID_ROW_HEIGHT;
    return indicatorTop >= 0 && indicatorTop <= maxTop;
  }, [indicatorTop, selectedDate]);

  useEffect(() => {
    if (!containerRef.current || !showIndicator) {
      return;
    }

    if (hasAutoScrolledRef.current) {
      return;
    }

    hasAutoScrolledRef.current = true;
    const containerHeight = containerRef.current.clientHeight;
    containerRef.current.scrollTo({
      top: Math.max(indicatorTop - containerHeight / 3, 0),
      behavior: "smooth"
    });
  }, [indicatorTop, showIndicator]);

  useEffect(() => {
    if (showIndicator) {
      return;
    }
    hasAutoScrolledRef.current = false;
  }, [showIndicator]);

  const handleGridClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const y = event.clientY - bounds.top + event.currentTarget.scrollTop;
    const totalMinutes = Math.max(0, (y / GRID_ROW_HEIGHT) * 60);
    const rounded = Math.round(totalMinutes / 30) * 30;
    const hoursPart = Math.floor(rounded / 60) + BUSINESS_START_HOUR;
    const minutesPart = rounded % 60;
    const targetDate = set(selectedDate, {
      hours: Math.min(hoursPart, BUSINESS_END_HOUR),
      minutes: minutesPart,
      seconds: 0,
      milliseconds: 0
    });

    onSelectTime(targetDate);
  };

  return (
    <div
      ref={containerRef}
      className="relative h-[calc(100dvh-190px)] overflow-y-auto rounded-[28px] bg-card scrollbar-none"
      onClick={handleGridClick}
    >
      <div className="relative" style={{ height: hours.length * GRID_ROW_HEIGHT }}>
        {hours.map((hour) => (
          <div
            key={hour}
            className="relative flex items-start"
            style={{ height: GRID_ROW_HEIGHT }}
          >
            <div className="w-14 pt-2 text-center text-sm font-medium text-muted">
              {format(set(selectedDate, { hours: hour, minutes: 0 }), "HH")}
            </div>
            <div className="mt-4 h-px flex-1 bg-slate-200" />
          </div>
        ))}

        {showIndicator ? (
          <div
            className="pointer-events-none absolute left-14 right-3 z-20"
            style={{ top: `${indicatorTop}px` }}
          >
            <div className="relative flex items-center">
              <div className="-ml-1 h-2 w-2 rounded-full bg-orange-500" />
              <div className="h-0.5 flex-1 bg-orange-500" />
            </div>
          </div>
        ) : null}

        {appointments.map((appointment) => (
          <AppointmentBlock
            key={appointment.id}
            appointment={appointment}
            onClick={onSelectAppointment}
          />
        ))}
      </div>
    </div>
  );
}
