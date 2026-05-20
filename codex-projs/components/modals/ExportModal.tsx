"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import type { Client } from "@/types";

interface ExportModalProps {
  open: boolean;
  onClose: () => void;
}

interface ExportAppointmentRow {
  id: string;
  start_time: string;
  end_time: string;
  client_name: string;
  client_phone: string;
  confirmation: 0 | 1;
  notes: string | null;
  created_at: string;
  specialists: { id: string; name: string }[] | null;
  services: { id: string; name: string; duration_minutes: number; price: number }[] | null;
}

function toInputDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function ExportModal({ open, onClose }: ExportModalProps) {
  const supabase = useSupabase();

  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [dateFrom, setDateFrom] = useState(toInputDate(firstOfMonth));
  const [dateTo, setDateTo] = useState(toInputDate(today));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleExport = async () => {
    if (!dateFrom || !dateTo) {
      setError("Укажите начало и конец периода.");
      return;
    }
    if (dateFrom > dateTo) {
      setError("Начало периода не может быть позже конца.");
      return;
    }

    setLoading(true);
    setError(null);

    const { data: appointments, error: apptError } = await supabase
      .from("appointments")
      .select(`
        id,
        start_time,
        end_time,
        client_name,
        client_phone,
        confirmation,
        notes,
        created_at,
        specialists ( id, name ),
        services ( id, name, duration_minutes, price )
      `)
      .gte("start_time", `${dateFrom}T00:00:00`)
      .lte("start_time", `${dateTo}T23:59:59`)
      .order("start_time", { ascending: true });

    if (apptError) {
      setError(apptError.message);
      setLoading(false);
      return;
    }

    const { data: clients, error: clientsError } = await supabase
      .from("clients")
      .select("id, name, phone, created_at")
      .order("name", { ascending: true });

    if (clientsError) {
      setError(clientsError.message);
      setLoading(false);
      return;
    }

    const normalizedAppointments = (appointments ?? []) as unknown as ExportAppointmentRow[];
    const normalizedClients = (clients ?? []) as Client[];

    const apptRows = normalizedAppointments.map((a, idx) => ({
      "№": idx + 1,
      "Дата и время": formatDateTime(a.start_time),
      "Окончание": formatDateTime(a.end_time),
      "Клиент": a.client_name,
      "Телефон": a.client_phone,
      "Специалист": a.specialists?.[0]?.name ?? "—",
      "Услуга": a.services?.[0]?.name ?? "—",
      "Длительность (мин)": a.services?.[0]?.duration_minutes ?? "—",
      "Цена (₽)": a.services?.[0]?.price ?? "—",
      "Статус": a.confirmation === 1 ? "Подтверждён" : "Ожидание",
      "Заметка": a.notes ?? "",
      "Создана": formatDateTime(a.created_at)
    }));

    const clientRows = normalizedClients.map((c, idx) => ({
      "№": idx + 1,
      "Имя": c.name,
      "Телефон": c.phone,
      "Добавлен": formatDate(c.created_at)
    }));

    const wb = XLSX.utils.book_new();

    const wsAppt = XLSX.utils.json_to_sheet(apptRows);
    wsAppt["!cols"] = [
      { wch: 4 },
      { wch: 18 },
      { wch: 18 },
      { wch: 22 },
      { wch: 16 },
      { wch: 20 },
      { wch: 24 },
      { wch: 18 },
      { wch: 12 },
      { wch: 14 },
      { wch: 28 },
      { wch: 18 }
    ];
    XLSX.utils.book_append_sheet(wb, wsAppt, "Записи");

    const wsClients = XLSX.utils.json_to_sheet(clientRows);
    wsClients["!cols"] = [{ wch: 4 }, { wch: 24 }, { wch: 16 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, wsClients, "Клиенты");

    const fileName = `appointments_${dateFrom}_${dateTo}.xlsx`;
    XLSX.writeFile(wb, fileName);

    setLoading(false);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-slate-950/30" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-4">
        <div className="w-full max-w-[430px] rounded-[32px] bg-card p-5 shadow-sheet">
          <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200" />
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold text-ink">Выгрузка в Excel</h3>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100"
              aria-label="Закрыть"
            >
              <span className="text-[16px] leading-none text-muted">×</span>
            </button>
          </div>

          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-ink">Начало периода</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-accent"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-ink">Конец периода</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-accent"
              />
            </label>
          </div>

          {error ? <p className="mt-3 text-sm text-red-500">{error}</p> : null}

          <button
            type="button"
            onClick={() => { void handleExport(); }}
            disabled={loading}
            className="mt-5 w-full rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading ? "Формируем файл..." : "Выгрузить"}
          </button>
        </div>
      </div>
    </>
  );
}
