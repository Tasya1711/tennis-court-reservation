"use client";

import { useState } from "react";
import { ACTIVE_PAYMENT_PROVIDER, PAYMENT_CHECKOUT_ENDPOINTS } from "@/lib/payments/provider";

export function PayButton({ reservationId, amountUah }: { reservationId: string; amountUah: number }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePay() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(PAYMENT_CHECKOUT_ENDPOINTS[ACTIVE_PAYMENT_PROVIDER], {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservationId }),
      });
      const body = await res.json().catch(() => ({}));

      if (res.status === 410) {
        setError("Час бронювання сплив. Оберіть слот ще раз.");
        return;
      }
      if (!res.ok || !body.paymentUrl) {
        setError("Не вдалося створити платіж. Спробуйте ще раз.");
        return;
      }

      window.location.href = body.paymentUrl;
    } catch {
      setError("Немає з’єднання з сервером. Перевірте інтернет-з’єднання.");
      setLoading(false);
    }
  }

  return (
    <div>
      {error && <p className="mb-3 text-center text-sm text-red-600">{error}</p>}
      <button
        type="button"
        onClick={handlePay}
        disabled={loading}
        className="block w-full rounded-full bg-neutral-900 py-4 text-center text-[15px] font-semibold text-white transition disabled:opacity-50"
      >
        {loading ? "Переходимо до оплати…" : `Сплатити ${amountUah} ₴`}
      </button>
    </div>
  );
}
