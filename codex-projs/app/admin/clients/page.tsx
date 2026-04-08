"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AddClientModal } from "@/components/modals/AddClientModal";
import { EditClientModal } from "@/components/modals/EditClientModal";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useClients } from "@/lib/hooks/useClients";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import type { Client } from "@/types";

export default function AdminClientsPage() {
  const supabase = useSupabase();
  const isOnline = useOnlineStatus();
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const { clients: fetchedClients, loading, error } = useClients(search);
  const [clients, setClients] = useState<Client[]>([]);

  const searchLower = useMemo(() => search.trim().toLowerCase(), [search]);
  const matchesFilter = useCallback(
    (client: Client) => {
      if (!searchLower) {
        return true;
      }
      return (
        client.name.toLowerCase().includes(searchLower) ||
        client.phone.toLowerCase().includes(searchLower)
      );
    },
    [searchLower]
  );

  useEffect(() => {
    setClients(fetchedClients);
  }, [fetchedClients]);

  useEffect(() => {
    const channel = supabase
      .channel("clients-admin")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "clients" },
        (payload) => {
          const newClient = payload.new as Client;
          if (!matchesFilter(newClient)) {
            return;
          }
          setClients((prev) => {
            if (prev.some((c) => c.id === newClient.id)) {
              return prev;
            }
            return [newClient, ...prev];
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "clients" },
        (payload) => {
          const updated = payload.new as Client;
          setClients((prev) => {
            const exists = prev.some((c) => c.id === updated.id);
            if (!exists) {
              return matchesFilter(updated) ? [updated, ...prev] : prev;
            }
            if (!matchesFilter(updated)) {
              return prev.filter((c) => c.id !== updated.id);
            }
            return prev.map((c) => (c.id === updated.id ? updated : c));
          });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [matchesFilter, supabase]);

  return (
    <div className="space-y-4">
      <header className="rounded-[28px] bg-white px-4 py-4 shadow-sm">
        <Link href="/admin/schedule" className="text-sm font-medium text-accent">
          Назад
        </Link>
        <div className="mt-2 flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold text-ink">Клиенты</h1>
        </div>
      </header>

      {!isOnline ? (
        <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Нет подключения к интернету. Список может быть неполным.
        </div>
      ) : null}

      <section className="rounded-[28px] bg-white p-4 shadow-sm">
        <div className="flex gap-3">
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Поиск по имени или телефону"
            className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-accent"
          />
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="h-10 w-10 min-w-[40px] rounded-full bg-blue-600 text-xl font-light text-white"
            aria-label="Добавить клиента"
          >
            +
          </button>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="space-y-3 animate-pulse">
          <div className="h-20 rounded-[28px] bg-white" />
          <div className="h-20 rounded-[28px] bg-white" />
          <div className="h-20 rounded-[28px] bg-white" />
        </div>
      ) : (
        <section className="rounded-[28px] bg-white p-4 shadow-sm">
          <div className="mx-auto max-w-[430px] space-y-3">
            {clients.map((client) => (
              <button
                key={client.id}
                type="button"
                onClick={() => {
                  setSelectedClient(client);
                  setEditOpen(true);
                }}
                className="flex w-full items-center justify-between rounded-2xl bg-canvas px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{client.name}</p>
                  <p className="mt-1 truncate text-xs text-muted">{client.phone}</p>
                </div>
                <span className="text-muted">›</span>
              </button>
            ))}

            {!clients.length ? (
              <div className="rounded-2xl bg-canvas px-4 py-16 text-center text-sm text-muted">
                Клиентов пока нет
              </div>
            ) : null}
          </div>
        </section>
      )}

      <AddClientModal
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        onClientAdded={(createdClient) => {
          setClients((prev) => {
            if (prev.some((c) => c.id === createdClient.id)) {
              return prev;
            }
            return matchesFilter(createdClient) ? [createdClient, ...prev] : prev;
          });
        }}
      />

      <EditClientModal
        isOpen={editOpen}
        client={selectedClient}
        onClose={() => {
          setEditOpen(false);
          setSelectedClient(null);
        }}
        onClientUpdated={(updatedClient) => {
          setSelectedClient(updatedClient);
          setClients((prev) =>
            prev.map((client) => (client.id === updatedClient.id ? updatedClient : client))
          );
        }}
      />
    </div>
  );
}

