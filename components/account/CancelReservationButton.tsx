"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

export function CancelReservationButton({ reservationId }: { reservationId: string }) {
  const router = useRouter();
  const t = useTranslations("Account");
  const tCommon = useTranslations("Common");
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/reservations/${reservationId}/cancel`, { method: "POST" });
      if (!res.ok) {
        setError(
          res.status === 401
            ? tCommon("sessionExpired")
            : res.status === 409
              ? t("cancelNotAllowed")
              : t("cancelFailed"),
        );
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
        <p className="mb-2 text-xs text-neutral-500">{t("confirmCancel")}</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 rounded-full bg-neutral-900 py-2.5 text-center text-[13px] font-semibold text-white transition disabled:opacity-50"
          >
            {loading ? t("cancelling") : t("yesCancel")}
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
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="w-full rounded-full bg-black/[0.06] py-2.5 text-center text-[13px] font-medium text-neutral-700 transition active:scale-[0.99]"
      >
        {t("cancelReservation")}
      </button>
    </div>
  );
}
