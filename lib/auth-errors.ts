import type { AuthError } from "@supabase/supabase-js";

// Bilingual copy for Supabase Auth's structured error codes. Deliberately
// scoped to just the auth feature for now — full next-intl wiring is a
// later milestone, but the { uk, en } shape here is the same shape the
// eventual message JSON files will use, so lifting this in is mechanical.
type Bilingual = { uk: string; en: string };

const MESSAGES: Record<string, Bilingual> = {
  invalid_credentials: {
    uk: "Невірний email або пароль.",
    en: "Invalid email or password.",
  },
  email_exists: {
    uk: "Обліковий запис із такою поштою вже існує.",
    en: "An account with this email already exists.",
  },
  user_already_exists: {
    uk: "Обліковий запис із такою поштою вже існує.",
    en: "An account with this email already exists.",
  },
  weak_password: {
    uk: "Пароль занадто простий. Використайте щонайменше 8 символів.",
    en: "Password is too weak. Use at least 8 characters.",
  },
  email_address_invalid: {
    uk: "Некоректна електронна адреса.",
    en: "Invalid email address.",
  },
  validation_failed: {
    uk: "Перевірте правильність заповнення полів.",
    en: "Please check the fields and try again.",
  },
  over_request_rate_limit: {
    uk: "Забагато спроб. Спробуйте, будь ласка, трохи пізніше.",
    en: "Too many attempts. Please try again in a little while.",
  },
  over_email_send_rate_limit: {
    uk: "Забагато спроб. Спробуйте, будь ласка, трохи пізніше.",
    en: "Too many attempts. Please try again in a little while.",
  },
  user_banned: {
    uk: "Доступ до цього облікового запису обмежено.",
    en: "This account has been restricted.",
  },
  email_not_confirmed: {
    uk: "Підтвердіть, будь ласка, свою електронну пошту.",
    en: "Please confirm your email address.",
  },
  signup_disabled: {
    uk: "Реєстрація тимчасово недоступна.",
    en: "Registration is temporarily unavailable.",
  },
  anonymous_provider_disabled: {
    uk: "Гостьовий доступ тимчасово недоступний.",
    en: "Guest access is temporarily unavailable.",
  },
};

const GENERIC: Bilingual = {
  uk: "Щось пішло не так. Спробуйте ще раз.",
  en: "Something went wrong. Please try again.",
};

const NETWORK: Bilingual = {
  uk: "Немає з’єднання з сервером. Перевірте інтернет-з’єднання.",
  en: "Couldn't reach the server. Check your connection.",
};

export function authErrorMessage(error: unknown, locale: "uk" | "en" = "uk"): string {
  if (error instanceof TypeError) {
    // fetch() throws a bare TypeError on network failure
    return NETWORK[locale];
  }
  const code = (error as AuthError | undefined)?.code;
  if (code && MESSAGES[code]) {
    return MESSAGES[code][locale];
  }
  return GENERIC[locale];
}

// Client-side field validation copy (not Supabase errors, but same shape
// so the two can render through the same UI).
export const validationMessages = {
  usernameRequired: { uk: "Вкажіть ім’я користувача.", en: "Username is required." },
  usernameFormat: {
    uk: "3–20 символів: латинські літери, цифри або підкреслення.",
    en: "3–20 characters: letters, numbers, or underscores.",
  },
  usernameTaken: { uk: "Це ім’я вже зайняте.", en: "This username is already taken." },
  emailRequired: { uk: "Вкажіть електронну пошту.", en: "Email is required." },
  passwordTooShort: { uk: "Мінімум 8 символів.", en: "At least 8 characters." },
  passwordsDontMatch: { uk: "Паролі не збігаються.", en: "Passwords don't match." },
} satisfies Record<string, Bilingual>;
