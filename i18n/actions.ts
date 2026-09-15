"use server";

import { cookies } from "next/headers";
import type { Locale } from "@/i18n/locale";

const COOKIE_NAME = "locale";

export async function setUserLocale(locale: Locale) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, locale, { maxAge: 60 * 60 * 24 * 365, path: "/" });
}
