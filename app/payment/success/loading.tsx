import { Skeleton } from "@/components/loading/Skeleton";

// Mirrors the payment-success page's shape — a single centered block over
// a blurred photo background, no desktop split (matching that page's own
// structure). Purely presentational.
export default function PaymentSuccessLoading() {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-neutral-900 px-6 text-center">
      <div className="relative z-10 w-full max-w-xs space-y-3">
        <Skeleton tone="dark" className="mx-auto h-6 w-56" />
        <Skeleton tone="dark" className="mx-auto h-3.5 w-64" />
        <Skeleton tone="dark" className="mt-6 h-[52px] w-full rounded-full" />
      </div>
    </main>
  );
}
