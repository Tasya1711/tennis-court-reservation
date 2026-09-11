"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

type CourtType = "INDOOR" | "OUTDOOR";
type Court = {
  id: string;
  name: string;
  type: CourtType;
  priceUah: number;
  isActive: boolean;
  sortOrder: number;
};

const inputClass =
  "w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-[15px] text-neutral-900 placeholder:text-neutral-400 outline-none transition focus:border-neutral-900/30";
const labelClass = "mb-1 block text-[13px] font-medium text-neutral-500";

const TYPE_LABEL: Record<CourtType, string> = { INDOOR: "Критий", OUTDOOR: "Відкритий" };

export function AdminCourtsScreen({ courts }: { courts: Court[] }) {
  return (
    <main className="relative min-h-dvh overflow-hidden bg-[#f4f1ec]">
      <div className="relative h-[22vh] min-h-[170px] w-full overflow-hidden px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-5">
        <Image src="/images/first-page_photo.jpeg" alt="" fill priority sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/15 to-black/55" />
        <div className="relative z-10 flex items-center justify-between">
          <h1 className="text-lg font-medium text-white">Керування кортами</h1>
          <Link
            href="/home"
            aria-label="На головну"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/25 backdrop-blur-sm"
          >
            <BackIcon />
          </Link>
        </div>
      </div>

      <div className="relative z-10 -mt-6 rounded-t-[2rem] bg-[#f4f1ec] px-4 pb-10 pt-6 text-neutral-900">
        <AddCourtForm />

        <p className="mt-8 text-[15px] font-medium">Корти ({courts.length})</p>
        <div className="mt-4 space-y-3">
          {courts.map((c) => (
            <CourtRow key={c.id} court={c} />
          ))}
        </div>
      </div>
    </main>
  );
}

function AddCourtForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<CourtType>("OUTDOOR");
  const [priceUah, setPriceUah] = useState("500");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/courts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), type, priceUah: Number(priceUah) }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(
          body.error === "duplicate_name"
            ? "Корт з такою назвою вже існує."
            : "Не вдалося створити корт. Перевірте введені дані.",
        );
        setSubmitting(false);
        return;
      }
      setName("");
      setPriceUah("500");
      setOpen(false);
      router.refresh();
    } catch {
      setError("Немає з’єднання з сервером.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-full bg-neutral-900 py-3.5 text-center text-[15px] font-semibold text-white transition active:scale-[0.99]"
      >
        Додати корт
      </button>
    );
  }

  return (
    <div className="rounded-2xl bg-black/[0.04] p-5">
      <p className="mb-3 text-sm font-medium">Новий корт</p>
      {error && <p className="mb-3 text-xs text-red-600">{error}</p>}
      <div className="space-y-3">
        <div>
          <label className={labelClass}>Назва</label>
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Наприклад, D1" />
        </div>
        <div>
          <label className={labelClass}>Тип</label>
          <select className={inputClass} value={type} onChange={(e) => setType(e.target.value as CourtType)}>
            <option value="OUTDOOR">Відкритий</option>
            <option value="INDOOR">Критий</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Ціна (₴)</label>
          <input
            className={inputClass}
            type="number"
            min={1}
            value={priceUah}
            onChange={(e) => setPriceUah(e.target.value)}
          />
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={handleCreate}
          disabled={submitting || !name.trim() || !priceUah}
          className="flex-1 rounded-full bg-neutral-900 py-2.5 text-center text-[13px] font-semibold text-white transition disabled:opacity-50"
        >
          {submitting ? "Створюємо…" : "Створити"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={submitting}
          className="flex-1 rounded-full bg-black/[0.06] py-2.5 text-center text-[13px] font-medium text-neutral-700 transition disabled:opacity-50"
        >
          Скасувати
        </button>
      </div>
    </div>
  );
}

function CourtRow({ court }: { court: Court }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(court.name);
  const [type, setType] = useState<CourtType>(court.type);
  const [priceUah, setPriceUah] = useState(String(court.priceUah));
  const [sortOrder, setSortOrder] = useState(String(court.sortOrder));

  async function patch(data: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/courts/${court.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(
          body.error === "duplicate_name" ? "Корт з такою назвою вже існує." : "Не вдалося зберегти зміни.",
        );
        setBusy(false);
        return false;
      }
      router.refresh();
      return true;
    } catch {
      setError("Немає з’єднання з сервером.");
      return false;
    } finally {
      // router.refresh() re-fetches server data but doesn't remount this
      // component (same key), so local `busy` state must be cleared
      // explicitly here — otherwise a successful edit leaves the row's
      // buttons permanently disabled.
      setBusy(false);
    }
  }

  async function handleSaveEdit() {
    const ok = await patch({
      name: name.trim(),
      type,
      priceUah: Number(priceUah),
      sortOrder: Number(sortOrder),
    });
    if (ok) setEditing(false);
  }

  async function handleToggleActive() {
    await patch({ isActive: !court.isActive });
  }

  async function handleDelete() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/courts/${court.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(
          body.error === "has_reservations"
            ? "Цей корт має історію бронювань — видалення неможливе. Вимкніть його замість цього."
            : "Не вдалося видалити корт.",
        );
        setBusy(false);
        setConfirmingDelete(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Немає з’єднання з сервером.");
      setBusy(false);
      setConfirmingDelete(false);
    }
  }

  if (editing) {
    return (
      <div className="rounded-2xl bg-black/[0.04] p-5">
        {error && <p className="mb-3 text-xs text-red-600">{error}</p>}
        <div className="space-y-3">
          <div>
            <label className={labelClass}>Назва</label>
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Тип</label>
            <select className={inputClass} value={type} onChange={(e) => setType(e.target.value as CourtType)}>
              <option value="OUTDOOR">Відкритий</option>
              <option value="INDOOR">Критий</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Ціна (₴)</label>
            <input className={inputClass} type="number" min={1} value={priceUah} onChange={(e) => setPriceUah(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Порядок відображення</label>
            <input className={inputClass} type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={handleSaveEdit}
            disabled={busy || !name.trim() || !priceUah}
            className="flex-1 rounded-full bg-neutral-900 py-2.5 text-center text-[13px] font-semibold text-white transition disabled:opacity-50"
          >
            {busy ? "Зберігаємо…" : "Зберегти"}
          </button>
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setName(court.name);
              setType(court.type);
              setPriceUah(String(court.priceUah));
              setSortOrder(String(court.sortOrder));
              setError(null);
            }}
            disabled={busy}
            className="flex-1 rounded-full bg-black/[0.06] py-2.5 text-center text-[13px] font-medium text-neutral-700 transition disabled:opacity-50"
          >
            Скасувати
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-black/[0.04] p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-neutral-900">{court.name}</p>
          <p className="mt-0.5 text-xs text-neutral-500">
            {TYPE_LABEL[court.type]} · {court.priceUah} ₴ · порядок {court.sortOrder}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${
            court.isActive ? "bg-emerald-600/10 text-emerald-700" : "bg-black/[0.06] text-neutral-600"
          }`}
        >
          {court.isActive ? "Активний" : "Вимкнено"}
        </span>
      </div>

      {error && <p className="mt-3 text-xs text-red-600">{error}</p>}

      {confirmingDelete ? (
        <div className="mt-3">
          <p className="mb-2 text-xs text-neutral-500">Видалити цей корт назавжди?</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleDelete}
              disabled={busy}
              className="flex-1 rounded-full bg-red-600 py-2.5 text-center text-[13px] font-semibold text-white transition disabled:opacity-50"
            >
              {busy ? "Видаляємо…" : "Так, видалити"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              disabled={busy}
              className="flex-1 rounded-full bg-black/[0.06] py-2.5 text-center text-[13px] font-medium text-neutral-700 transition disabled:opacity-50"
            >
              Ні
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setEditing(true)}
            disabled={busy}
            className="rounded-full bg-black/[0.06] px-4 py-2 text-[13px] font-medium text-neutral-700 transition disabled:opacity-50"
          >
            Редагувати
          </button>
          <button
            type="button"
            onClick={handleToggleActive}
            disabled={busy}
            className="rounded-full bg-black/[0.06] px-4 py-2 text-[13px] font-medium text-neutral-700 transition disabled:opacity-50"
          >
            {court.isActive ? "Вимкнути" : "Увімкнути"}
          </button>
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            disabled={busy}
            className="rounded-full bg-black/[0.06] px-4 py-2 text-[13px] font-medium text-red-600 transition disabled:opacity-50"
          >
            Видалити
          </button>
        </div>
      )}
    </div>
  );
}

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.75} stroke="white" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
    </svg>
  );
}
