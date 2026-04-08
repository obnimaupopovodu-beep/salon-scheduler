"use client";

import { useEffect, useState } from "react";

import { useSupabase } from "@/components/providers/SupabaseProvider";
import { normalizePhone } from "@/lib/utils";
import type { Client } from "@/types";

export interface EditClientModalProps {
  isOpen: boolean;
  client: Client | null;
  onClose: () => void;
  onClientUpdated: (client: Client) => void;
}

export function EditClientModal({ isOpen, client, onClose, onClientUpdated }: EditClientModalProps) {
  const supabase = useSupabase();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("+7");
  const [submitting, setSubmitting] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !client) {
      return;
    }

    setName(client.name);
    setPhone(client.phone);
    setSubmitting(false);
    setPhoneError(null);
    setFormError(null);
  }, [client, isOpen]);

  if (!isOpen || !client) {
    return null;
  }

  const canSubmit = Boolean(name.trim()) && Boolean(phone.trim());

  const submit = async () => {
    if (!canSubmit || submitting) {
      return;
    }

    setSubmitting(true);
    setPhoneError(null);
    setFormError(null);

    const payload = {
      name: name.trim(),
      phone: normalizePhone(phone)
    };

    const { data: updatedClient, error: updateError } = await supabase
      .from("clients")
      .update(payload)
      .eq("id", client.id)
      .select("*")
      .single();

    if (updateError) {
      if (updateError.code === "23505") {
        setPhoneError("Клиент с таким номером уже существует");
      } else {
        setFormError(updateError.message);
      }
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    onClientUpdated(updatedClient as Client);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-slate-950/30" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-4">
        <div className="w-full max-w-[430px] rounded-[32px] bg-card p-5 shadow-sheet transition">
          <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200" />
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold text-ink">Редактировать клиента</h3>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100"
              aria-label="Закрыть"
            >
              <span className="text-[16px] leading-none text-muted">×</span>
            </button>
          </div>

          <div className="mt-4 space-y-4">
            <label className="block">
              <span className="mb-1 block text-sm text-gray-500">Имя</span>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-base outline-none focus:border-accent"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm text-gray-500">Телефон</span>
              <input
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="+7 (___) ___-__-__"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-base outline-none focus:border-accent"
              />
              {phoneError ? <p className="mt-2 text-sm text-red-500">{phoneError}</p> : null}
            </label>
          </div>

          {formError ? <p className="mt-3 text-sm text-red-500">{formError}</p> : null}

          <button
            type="button"
            onClick={() => {
              void submit();
            }}
            className={[
              "mt-5 w-full rounded-xl bg-blue-600 py-3 text-base font-medium text-white",
              !canSubmit ? "opacity-50 pointer-events-none" : "",
              submitting ? "opacity-50 pointer-events-none" : ""
            ].join(" ")}
          >
            {submitting ? "Сохраняем..." : "Сохранить"}
          </button>
        </div>
      </div>
    </>
  );
}

