export type Locale = "uk" | "en";
export const locales: Locale[] = ["uk", "en"];
export const defaultLocale: Locale = "uk";

export function isLocale(value: string | undefined): value is Locale {
  return value === "uk" || value === "en";
}
