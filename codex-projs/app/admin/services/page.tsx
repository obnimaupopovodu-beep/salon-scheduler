"use client";

import Link from "next/link";
import { useState } from "react";

import { ConfirmModal } from "@/components/modals/ConfirmModal";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useServices } from "@/hooks/useServices";
import type { ServiceCategory } from "@/types";

export default function AdminServicesPage() {
  const supabase = useSupabase();
  const isOnline = useOnlineStatus();
  const { categories, groupedServices, loading, refetch } = useServices();
  const [categoryName, setCategoryName] = useState("");
  const [serviceForm, setServiceForm] = useState({
    id: "",
    name: "",
    category_id: "",
    price: "",
    duration_minutes: ""
  });
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ServiceCategory | null>(null);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [deleting, setDeleting] = useState<{
    type: "category" | "service";
    id: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingCategory, setSavingCategory] = useState(false);
  const [savingService, setSavingService] = useState(false);
  const [removing, setRemoving] = useState(false);

  const openCreateCategory = () => {
    setEditingCategory(null);
    setCategoryName("");
    setError(null);
    setShowCategoryModal(true);
  };

  const openEditCategory = (category: ServiceCategory) => {
    setEditingCategory(category);
    setCategoryName(category.name);
    setError(null);
    setShowCategoryModal(true);
  };

  const openCreateService = () => {
    setServiceForm({
      id: "",
      name: "",
      category_id: categories[0]?.id ?? "",
      price: "",
      duration_minutes: ""
    });
    setError(null);
    setShowServiceModal(true);
  };

  const saveCategory = async () => {
    if (!categoryName.trim()) {
      setError("Введите название категории.");
      return;
    }

    setSavingCategory(true);
    setError(null);

    const query = editingCategory
      ? supabase
          .from("service_categories")
          .update({ name: categoryName.trim() })
          .eq("id", editingCategory.id)
      : supabase.from("service_categories").insert({ name: categoryName.trim() });

    const { error: saveError } = await query;

    if (saveError) {
      setError(saveError.message);
      setSavingCategory(false);
      return;
    }

    setShowCategoryModal(false);
    setEditingCategory(null);
    setCategoryName("");
    setSavingCategory(false);
    await refetch();
  };

  const saveService = async () => {
    if (
      !serviceForm.name.trim() ||
      !serviceForm.category_id ||
      !serviceForm.price ||
      !serviceForm.duration_minutes
    ) {
      setError("Заполните все поля услуги.");
      return;
    }

    setSavingService(true);
    setError(null);

    const payload = {
      name: serviceForm.name.trim(),
      category_id: serviceForm.category_id,
      price: Number(serviceForm.price),
      duration_minutes: Number(serviceForm.duration_minutes)
    };

    const query = serviceForm.id
      ? supabase.from("services").update(payload).eq("id", serviceForm.id)
      : supabase.from("services").insert(payload);

    const { error: saveError } = await query;

    if (saveError) {
      setError(saveError.message);
      setSavingService(false);
      return;
    }

    setShowServiceModal(false);
    setServiceForm({ id: "", name: "", category_id: "", price: "", duration_minutes: "" });
    setSavingService(false);
    await refetch();
  };

  const handleDelete = async () => {
    if (!deleting) {
      return;
    }

    setRemoving(true);
    setError(null);

    const query =
      deleting.type === "category"
        ? supabase.from("service_categories").delete().eq("id", deleting.id)
        : supabase.from("services").delete().eq("id", deleting.id);

    const { error: deleteError } = await query;

    if (deleteError) {
      setError(deleteError.message);
      setRemoving(false);
      return;
    }

    setDeleting(null);
    setRemoving(false);
    await refetch();
  };

  return (
    <div className="space-y-4">
      <header className="rounded-[28px] bg-white px-4 py-4 shadow-sm">
        <Link href="/admin/schedule" className="text-sm font-medium text-accent">
          Назад
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-ink">Услуги</h1>
      </header>

      {!isOnline ? (
        <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Нет подключения к интернету. Изменения не будут отправлены, пока сеть не вернется.
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="space-y-3 animate-pulse">
          <div className="h-44 rounded-[28px] bg-white" />
          <div className="h-56 rounded-[28px] bg-white" />
        </div>
      ) : (
        <>
          <section className="rounded-[28px] bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-ink">Категории</h2>
              <button
                type="button"
                onClick={openCreateCategory}
                className="rounded-full bg-accent/10 px-4 py-2 text-sm font-medium text-accent"
              >
                Добавить категорию
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between rounded-2xl bg-canvas px-4 py-3"
                >
                  <span className="text-sm font-medium text-ink">{category.name}</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => openEditCategory(category)}
                      className="rounded-full bg-white px-3 py-2 text-sm"
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDeleting({ type: "category", id: category.id });
                        setError(null);
                      }}
                      className="rounded-full bg-white px-3 py-2 text-sm"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}

              {!categories.length ? (
                <div className="rounded-2xl bg-canvas px-4 py-8 text-center text-sm text-muted">
                  Пока нет категорий.
                </div>
              ) : null}
            </div>
          </section>

          <section className="rounded-[28px] bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-ink">Услуги</h2>
              <button
                type="button"
                onClick={openCreateService}
                className="rounded-full bg-accent/10 px-4 py-2 text-sm font-medium text-accent"
              >
                Добавить услугу
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {groupedServices.map((group) => (
                <div key={group.category.id}>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">
                    {group.category.name}
                  </h3>
                  <div className="mt-2 space-y-3">
                    {group.services.map((service) => (
                      <div
                        key={service.id}
                        className="flex items-center justify-between rounded-2xl bg-canvas px-4 py-3"
                      >
                        <div>
                          <p className="text-sm font-medium text-ink">{service.name}</p>
                          <p className="mt-1 text-xs text-muted">
                            {service.price} ₽ · {service.duration_minutes} мин
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setServiceForm({
                                id: service.id,
                                name: service.name,
                                category_id: service.category_id,
                                price: String(service.price),
                                duration_minutes: String(service.duration_minutes)
                              });
                              setError(null);
                              setShowServiceModal(true);
                            }}
                            className="rounded-full bg-white px-3 py-2 text-sm"
                          >
                            ✏️
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDeleting({ type: "service", id: service.id });
                              setError(null);
                            }}
                            className="rounded-full bg-white px-3 py-2 text-sm"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {!groupedServices.some((group) => group.services.length) ? (
                <div className="rounded-2xl bg-canvas px-4 py-8 text-center text-sm text-muted">
                  Пока нет услуг.
                </div>
              ) : null}
            </div>
          </section>
        </>
      )}

      {showCategoryModal ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-950/30 px-4 pb-4">
          <div className="w-full max-w-[430px] rounded-[32px] bg-white p-5 shadow-sheet">
            <h3 className="text-lg font-semibold text-ink">
              {editingCategory ? "Редактировать категорию" : "Новая категория"}
            </h3>
            <input
              type="text"
              value={categoryName}
              onChange={(event) => setCategoryName(event.target.value)}
              className="mt-4 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-accent"
              placeholder="Маникюр"
            />
            {error ? <p className="mt-3 text-sm text-red-500">{error}</p> : null}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowCategoryModal(false);
                  setError(null);
                }}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-ink"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => {
                  void saveCategory();
                }}
                disabled={savingCategory}
                className="rounded-2xl bg-accent px-4 py-3 text-sm font-medium text-white disabled:opacity-60"
              >
                {savingCategory ? "Сохраняем..." : "Сохранить"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showServiceModal ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-950/30 px-4 pb-4">
          <div className="w-full max-w-[430px] rounded-[32px] bg-white p-5 shadow-sheet">
            <h3 className="text-lg font-semibold text-ink">
              {serviceForm.id ? "Редактировать услугу" : "Новая услуга"}
            </h3>

            <div className="mt-4 space-y-4">
              <input
                type="text"
                value={serviceForm.name}
                onChange={(event) =>
                  setServiceForm((current) => ({ ...current, name: event.target.value }))
                }
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-accent"
                placeholder="Название"
              />
              <select
                value={serviceForm.category_id}
                onChange={(event) =>
                  setServiceForm((current) => ({
                    ...current,
                    category_id: event.target.value
                  }))
                }
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-accent"
              >
                <option value="">Выберите категорию</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={serviceForm.price}
                onChange={(event) =>
                  setServiceForm((current) => ({ ...current, price: event.target.value }))
                }
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-accent"
                placeholder="Стоимость"
              />
              <input
                type="number"
                value={serviceForm.duration_minutes}
                onChange={(event) =>
                  setServiceForm((current) => ({
                    ...current,
                    duration_minutes: event.target.value
                  }))
                }
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-accent"
                placeholder="Длительность"
              />
            </div>

            {error ? <p className="mt-3 text-sm text-red-500">{error}</p> : null}

            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowServiceModal(false);
                  setError(null);
                }}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-ink"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => {
                  void saveService();
                }}
                disabled={savingService}
                className="rounded-2xl bg-accent px-4 py-3 text-sm font-medium text-white disabled:opacity-60"
              >
                {savingService ? "Сохраняем..." : "Сохранить"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmModal
        open={Boolean(deleting)}
        title="Подтвердите удаление"
        description="Данные будут удалены без возможности восстановления."
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (!removing) {
            void handleDelete();
          }
        }}
      />
    </div>
  );
}
