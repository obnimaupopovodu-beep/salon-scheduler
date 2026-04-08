"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { useSupabase } from "@/components/providers/SupabaseProvider";
import { cn, normalizePhone } from "@/lib/utils";
import type { Client } from "@/types";

interface ClientAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelectClient: (client: Pick<Client, "name" | "phone">) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function ClientAutocomplete({
  value,
  onChange,
  onSelectClient,
  placeholder = "Анна",
  disabled
}: ClientAutocompleteProps) {
  const supabase = useSupabase();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const requestIdRef = useRef(0);

  const effectiveQuery = useMemo(() => (query ?? "").trim(), [query]);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (effectiveQuery.length < 1) {
      setResults([]);
      setLoading(false);
      return;
    }

    const currentRequestId = ++requestIdRef.current;
    setLoading(true);

    void (async () => {
      const q = effectiveQuery.replaceAll("%", "\\%").replaceAll("_", "\\_");
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .or(`name.ilike.%${q}%,phone.ilike.%${q}%`)
        .limit(5);

      if (requestIdRef.current !== currentRequestId) {
        return;
      }

      if (error) {
        setResults([]);
        setLoading(false);
        return;
      }

      setResults((data as Client[]) ?? []);
      setLoading(false);
    })();
  }, [effectiveQuery, open, supabase]);

  return (
    <div className="relative">
      {open ? (
        <div className="absolute inset-x-0 bottom-full mb-2 rounded-2xl border border-slate-200 bg-white shadow-lg">
          {loading ? (
            <div className="px-4 py-3 text-sm text-muted">Ищем...</div>
          ) : results.length ? (
            <div className="max-h-56 overflow-auto py-1">
              {results.map((client) => (
                <button
                  key={client.id}
                  type="button"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    onSelectClient({ name: client.name, phone: normalizePhone(client.phone) });
                    setOpen(false);
                    setResults([]);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition",
                    "hover:bg-slate-50 active:bg-slate-100"
                  )}
                >
                  <span className="min-w-0 truncate text-sm font-semibold text-ink">
                    {client.name}
                  </span>
                  <span className="shrink-0 text-xs text-muted">{client.phone}</span>
                </button>
              ))}
            </div>
          ) : effectiveQuery.length >= 2 ? (
            <div className="px-4 py-3 text-sm text-muted opacity-70">Новый клиент</div>
          ) : null}
        </div>
      ) : null}

      <input
        type="text"
        value={value}
        onChange={(event) => {
          const next = event.target.value;
          onChange(next);
          setQuery(next);
          if (!next.trim()) {
            setResults([]);
            setOpen(false);
          } else {
            setOpen(true);
          }
        }}
        onFocus={() => {
          setOpen(Boolean(value.trim()));
        }}
        onBlur={() => {
          setOpen(false);
        }}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-accent disabled:opacity-60"
      />
    </div>
  );
}

