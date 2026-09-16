"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

// Shown only for a PENDING_PAYMENT reservation still within its hold (the
// account page already filters out ones whose hold has expired before this
// ever renders — see app/account/page.tsx). "Continue" reuses the existing
// /reserve/summary payment flow for this exact reservation (same id, same
// hold, no new reservation) — clicking "Сплатити" there creates a fresh
// Stripe Checkout Session tied to the same reservationId, exactly as it
// already does today. "Delete" calls the same POST /cancel endpoint
// CancelReservationButton uses, just with PENDING_PAYMENT now also
// accepted server-side, so it's a real DB transition (CANCELLED), not a
// UI-only hide, and the slot frees immediately (courts/:id/availability
// only blocks on CONFIRMED / an unexpired PENDING_PAYMENT).
export function PendingReservationActions({ reservationId }: { reservationId: string }) {
  const router = useRouter();
  const t = useTranslations("Account");
  const tCommon = useTranslations("Common");
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/reservations/${reservationId}/cancel`, { method: "POST" });
      if (!res.ok) {
        setError(res.status === 409 ? t("deleteNotAllowed") : t("deleteFailed"));
        setLoading(false);
        setConfirming(false);
        return;
      }
      // The database is the source of truth — re-fetch the server-rendered
      // list rather than optimistically flipping local state.
      router.refresh();
    } catch {
      setError(tCommon("networkError"));
      setLoading(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <div className="mt-3">
        {error && <p className="mb-2 text-xs text-red-600">{error}</p>}
        <p className="mb-2 text-xs text-neutral-500">{t("confirmDeleteReservation")}</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="flex-1 rounded-full bg-red-600 py-2.5 text-center text-[13px] font-semibold text-white transition disabled:opacity-50"
          >
            {loading ? t("deletingReservation") : t("yesDeleteReservation")}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            disabled={loading}
            className="flex-1 rounded-full bg-black/[0.06] py-2.5 text-center text-[13px] font-medium text-neutral-700 transition disabled:opacity-50"
          >
            {tCommon("no")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3">
      {error && <p className="mb-2 text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <Link
          href={`/reserve/summary?id=${reservationId}`}
          className="flex-1 rounded-full bg-neutral-900 py-2.5 text-center text-[13px] font-semibold text-white transition active:scale-[0.99]"
        >
          {t("continuePayment")}
        </Link>
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="flex-1 rounded-full bg-black/[0.06] py-2.5 text-center text-[13px] font-medium text-red-600 transition active:scale-[0.99]"
        >
          {t("deleteReservation")}
        </button>
      </div>
    </div>
  );
}
