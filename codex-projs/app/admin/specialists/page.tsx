"use client";

import Link from "next/link";
import { useState } from "react";

import { ConfirmModal } from "@/components/modals/ConfirmModal";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { useBranches } from "@/hooks/useBranches";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useSpecialists } from "@/hooks/useSpecialists";
import type { Specialist } from "@/types";

export default function AdminSpecialistsPage() {
  const supabase = useSupabase();
  const isOnline = useOnlineStatus();
  const { branches, loading: branchesLoading } = useBranches();
  const { specialists, loading, refetch } = useSpecialists();
  const [name, setName] = useState("");
  const [branchId, setBranchId] = useState("");
  const [editing, setEditing] = useState<Specialist | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  const openCreateModal = () => {
    setEditing(null);
    setName("");
    setBranchId(branches[0]?.id ?? "");
    setError(null);
    setModalOpen(true);
  };

  const openEditModal = (specialist: Specialist) => {
    setEditing(specialist);
    setName(specialist.name);
    setBranchId(specialist.branch_id ?? branches[0]?.id ?? "");
    setError(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setError(null);
    setSaving(false);
  };

  const save = async () => {
    if (!name.trim()) {
      setError("Введите имя специалиста.");
      return;
    }

    if (!branchId) {
      setError("Выберите филиал специалиста.");
      return;
    }

    setSaving(true);
    setError(null);

    const query = editing
      ? supabase.from("specialists").update({ name: name.trim(), branch_id: branchId }).eq("id", editing.id)
      : supabase.from("specialists").insert({ name: name.trim(), branch_id: branchId });

    const { error: saveError } = await query;

    if (saveError) {
      setError(saveError.message);
      setSaving(false);
      return;
    }

    closeModal();
    setName("");
    setEditing(null);
    await refetch();
  };

  const remove = async () => {
    if (!confirmId) {
      return;
    }

    setRemoving(true);
    setError(null);

    const { error: deleteError } = await supabase
      .from("specialists")
      .delete()
      .eq("id", confirmId);

    if (deleteError) {
      setError(deleteError.message);
      setRemoving(false);
      return;
    }

    setConfirmId(null);
    setRemoving(false);
    await refetch();
  };

  return (
    <div className="space-y-4">
      <header className="rounded-[28px] bg-white px-4 py-4 shadow-sm">
        <Link href="/admin/schedule" className="text-sm font-medium text-accent">
          Назад
        </Link>
        <div className="mt-2 flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold text-ink">Специалисты</h1>
          <button
            type="button"
            onClick={openCreateModal}
            className="rounded-full bg-accent/10 px-4 py-2 text-sm font-medium text-accent"
          >
            Добавить специалиста
          </button>
        </div>
      </header>

      {!isOnline ? (
        <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Нет подключения к интернету. Список может быть неполным.
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="space-y-3 animate-pulse">
          <div className="h-20 rounded-[28px] bg-white" />
          <div className="h-20 rounded-[28px] bg-white" />
        </div>
      ) : branchesLoading ? (
        <div className="space-y-3 animate-pulse">
          <div className="h-20 rounded-[28px] bg-white" />
          <div className="h-20 rounded-[28px] bg-white" />
        </div>
      ) : (
        <section className="rounded-[28px] bg-white p-4 shadow-sm">
          <div className="space-y-3">
            {specialists.map((specialist) => (
              <div
                key={specialist.id}
                className="flex items-center justify-between rounded-2xl bg-canvas px-4 py-3"
              >
                <div>
                  <span className="text-sm font-medium text-ink">{specialist.name}</span>
                  <p className="mt-1 text-xs text-muted">
                    {branches.find((branch) => branch.id === specialist.branch_id)?.name ?? "Филиал не указан"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => openEditModal(specialist)}
                    className="rounded-full bg-white px-3 py-2 text-sm"
                  >
                    ✏️
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmId(specialist.id);
                      setError(null);
                    }}
                    className="rounded-full bg-white px-3 py-2 text-sm"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}

            {!specialists.length ? (
              <div className="rounded-2xl bg-canvas px-4 py-8 text-center text-sm text-muted">
                Пока нет специалистов.
              </div>
            ) : null}
          </div>
        </section>
      )}

      {modalOpen ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-950/30 px-4 pb-4">
          <div className="w-full max-w-[430px] rounded-[32px] bg-white p-5 shadow-sheet">
            <h3 className="text-lg font-semibold text-ink">
              {editing ? "Редактировать специалиста" : "Новый специалист"}
            </h3>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-4 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-accent"
              placeholder="Имя"
            />
            <select
              value={branchId}
              onChange={(event) => setBranchId(event.target.value)}
              className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-accent"
            >
              <option value="">Выберите филиал</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
            {error ? <p className="mt-3 text-sm text-red-500">{error}</p> : null}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-ink"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => {
                  void save();
                }}
                disabled={saving}
                className="rounded-2xl bg-accent px-4 py-3 text-sm font-medium text-white disabled:opacity-60"
              >
                {saving ? "Сохраняем..." : "Сохранить"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmModal
        open={Boolean(confirmId)}
        title="Удалить специалиста?"
        description="Все связанные записи тоже будут удалены."
        onCancel={() => setConfirmId(null)}
        onConfirm={() => {
          if (!removing) {
            void remove();
          }
        }}
      />
    </div>
  );
}
