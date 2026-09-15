"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { type Court, type CourtType, inputClass, labelClass } from "@/components/admin/shared";

export function CourtRow({ court }: { court: Court }) {
  const router = useRouter();
  const t = useTranslations("Admin");
  const tCommon = useTranslations("Common");
  const TYPE_LABEL: Record<CourtType, string> = { INDOOR: t("indoor"), OUTDOOR: t("outdoor") };
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
        setError(body.error === "duplicate_name" ? t("duplicateNameError") : t("saveFailedError"));
        setBusy(false);
        return false;
      }
      router.refresh();
      return true;
    } catch {
      setError(tCommon("networkError"));
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
        setError(body.error === "has_reservations" ? t("hasReservationsError") : t("deleteFailedError"));
        setBusy(false);
        setConfirmingDelete(false);
        return;
      }
      router.refresh();
    } catch {
      setError(tCommon("networkError"));
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
            <label className={labelClass}>{t("nameLabel")}</label>
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>{t("typeLabel")}</label>
            <select className={inputClass} value={type} onChange={(e) => setType(e.target.value as CourtType)}>
              <option value="OUTDOOR">{t("outdoor")}</option>
              <option value="INDOOR">{t("indoor")}</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>{t("priceLabel")}</label>
            <input className={inputClass} type="number" min={1} value={priceUah} onChange={(e) => setPriceUah(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>{t("sortOrderLabel")}</label>
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
            {busy ? t("saving") : t("save")}
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
            {t("cancel")}
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
            {TYPE_LABEL[court.type]} · {court.priceUah} ₴ · {t("order")} {court.sortOrder}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${
            court.isActive ? "bg-emerald-600/10 text-emerald-700" : "bg-black/[0.06] text-neutral-600"
          }`}
        >
          {court.isActive ? t("active") : t("inactive")}
        </span>
      </div>

      {error && <p className="mt-3 text-xs text-red-600">{error}</p>}

      {confirmingDelete ? (
        <div className="mt-3">
          <p className="mb-2 text-xs text-neutral-500">{t("confirmDelete")}</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleDelete}
              disabled={busy}
              className="flex-1 rounded-full bg-red-600 py-2.5 text-center text-[13px] font-semibold text-white transition disabled:opacity-50"
            >
              {busy ? t("deleting") : t("yesDelete")}
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              disabled={busy}
              className="flex-1 rounded-full bg-black/[0.06] py-2.5 text-center text-[13px] font-medium text-neutral-700 transition disabled:opacity-50"
            >
              {t("no")}
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
            {t("edit")}
          </button>
          <button
            type="button"
            onClick={handleToggleActive}
            disabled={busy}
            className="rounded-full bg-black/[0.06] px-4 py-2 text-[13px] font-medium text-neutral-700 transition disabled:opacity-50"
          >
            {court.isActive ? t("deactivate") : t("activate")}
          </button>
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            disabled={busy}
            className="rounded-full bg-black/[0.06] px-4 py-2 text-[13px] font-medium text-red-600 transition disabled:opacity-50"
          >
            {t("delete")}
          </button>
        </div>
      )}
    </div>
  );
}
