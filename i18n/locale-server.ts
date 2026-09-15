import { cookies } from "next/headers";
import { defaultLocale, isLocale, type Locale } from "@/i18n/locale";

const COOKIE_NAME = "locale";

export async function getUserLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const value = cookieStore.get(COOKIE_NAME)?.value;
  return isLocale(value) ? value : defaultLocale;
}
