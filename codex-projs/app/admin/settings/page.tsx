"use client";

import { useState } from "react";

export default function AdminSettingsPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    const res = await fetch("/api/admin/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });

    if (res.ok) {
      setStatus("ok");
      setEmail("");
    } else {
      const data = await res.json() as { error?: string };
      setErrorMsg(data.error ?? "Неизвестная ошибка");
      setStatus("error");
    }
  };

  return (
    <div className="space-y-6">
      <header className="rounded-[28px] bg-white px-5 py-5 shadow-sm">
        <p className="text-sm font-medium text-accent">Настройки</p>
        <h1 className="mt-1 text-2xl font-semibold text-ink">Управление доступом</h1>
      </header>

      <section className="rounded-[28px] bg-white px-5 py-5 shadow-sm">
        <h2 className="text-base font-semibold text-ink">Пригласить администратора</h2>
        <p className="mt-1 text-sm text-muted">
          На указанный email придёт письмо со ссылкой для входа и установки пароля.
        </p>

        <form className="mt-4 space-y-3" onSubmit={handleInvite}>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-ink">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              required
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-accent"
            />
          </label>

          {status === "ok" && (
            <div className="rounded-2xl bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
              ✓ Приглашение отправлено на {email || "указанный email"}
            </div>
          )}
          {status === "error" && (
            <p className="text-sm text-red-500">{errorMsg}</p>
          )}

          <button
            type="submit"
            disabled={status === "loading"}
            className="w-full rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {status === "loading" ? "Отправляем..." : "Отправить приглашение"}
          </button>
        </form>
      </section>
    </div>
  );
}
