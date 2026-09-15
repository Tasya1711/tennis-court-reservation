"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { type CourtType, inputClass, labelClass } from "@/components/admin/shared";

export function AddCourtForm() {
  const router = useRouter();
  const t = useTranslations("Admin");
  const tCommon = useTranslations("Common");
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
        setError(body.error === "duplicate_name" ? t("duplicateNameError") : t("createFailedError"));
        setSubmitting(false);
        return;
      }
      setName("");
      setPriceUah("500");
      setOpen(false);
      router.refresh();
    } catch {
      setError(tCommon("networkError"));
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
        {t("addCourt")}
      </button>
    );
  }

  return (
    <div className="rounded-2xl bg-black/[0.04] p-5">
      <p className="mb-3 text-sm font-medium">{t("newCourt")}</p>
      {error && <p className="mb-3 text-xs text-red-600">{error}</p>}
      <div className="space-y-3">
        <div>
          <label className={labelClass}>{t("nameLabel")}</label>
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder={t("namePlaceholder")} />
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
          {submitting ? t("creating") : t("create")}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={submitting}
          className="flex-1 rounded-full bg-black/[0.06] py-2.5 text-center text-[13px] font-medium text-neutral-700 transition disabled:opacity-50"
        >
          {t("cancel")}
        </button>
      </div>
    </div>
  );
}
