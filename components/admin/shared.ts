export type CourtType = "INDOOR" | "OUTDOOR";
export type Court = {
  id: string;
  name: string;
  type: CourtType;
  priceUah: number;
  isActive: boolean;
  sortOrder: number;
};

export const inputClass =
  "w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-[15px] text-neutral-900 placeholder:text-neutral-400 outline-none transition focus:border-neutral-900/30";
export const labelClass = "mb-1 block text-[13px] font-medium text-neutral-500";
