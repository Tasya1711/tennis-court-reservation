"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CancelReservationButton({ reservationId }: { reservationId: string }) {
  const router = useRouter();
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
          res.status === 409
            ? "Це бронювання вже не можна скасувати."
            : "Не вдалося скасувати бронювання. Спробуйте ще раз.",
        );
        setLoading(false);
        setConfirming(false);
        return;
      }
      // The database is the source of truth — re-fetch the server-rendered
      // list rather than optimistically flipping local state.
      router.refresh();
    } catch {
      setError("Немає з’єднання з сервером. Перевірте інтернет-з’єднання.");
      setLoading(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <div className="mt-3">
        {error && <p className="mb-2 text-xs text-red-600">{error}</p>}
        <p className="mb-2 text-xs text-neutral-500">Скасувати це бронювання?</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 rounded-full bg-neutral-900 py-2.5 text-center text-[13px] font-semibold text-white transition disabled:opacity-50"
          >
            {loading ? "Скасовуємо…" : "Так, скасувати"}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            disabled={loading}
            className="flex-1 rounded-full bg-black/[0.06] py-2.5 text-center text-[13px] font-medium text-neutral-700 transition disabled:opacity-50"
          >
            Ні
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
        Скасувати бронювання
      </button>
    </div>
  );
}
