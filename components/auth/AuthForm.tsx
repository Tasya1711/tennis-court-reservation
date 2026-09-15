"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { authErrorMessage, validationMessages } from "@/lib/auth-errors";
import { loginSchema, registerSchema, usernameSchema } from "@/lib/validation/auth";

type Mode = "login" | "register";

const inputClass =
  "w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-[15px] text-white placeholder:text-white/40 outline-none backdrop-blur-sm transition focus:border-white/40 focus:bg-white/10";

const labelClass = "mb-1.5 block text-[13px] font-medium text-white/70";

export function AuthForm() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const supabase = createClient();

  const [mode, setMode] = useState<Mode>("login");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [username, setUsername] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "taken" | "available">("idle");
  const usernameCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  function switchMode(next: Mode) {
    setMode(next);
    setFormError(null);
    setInfoMessage(null);
    setFieldErrors({});
  }

  function onUsernameChange(value: string) {
    setUsername(value);
    setFieldErrors((prev) => ({ ...prev, username: "" }));
    if (usernameCheckTimer.current) clearTimeout(usernameCheckTimer.current);

    const parsed = usernameSchema.safeParse(value);
    if (!parsed.success) {
      setUsernameStatus("idle");
      return;
    }
    setUsernameStatus("checking");
    usernameCheckTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/auth/check-username?username=${encodeURIComponent(parsed.data)}`);
        const data = await res.json();
        setUsernameStatus(data.available ? "available" : "taken");
      } catch {
        setUsernameStatus("idle");
      }
    }, 400);
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setInfoMessage(null);

    const errors: Record<string, string> = {};
    const parsed = registerSchema.safeParse({ username, email, password });
    if (!parsed.success) {
      const issues = parsed.error.flatten().fieldErrors;
      if (issues.username) errors.username = validationMessages.usernameFormat.uk;
      if (issues.email) errors.email = validationMessages.emailRequired.uk;
      if (issues.password) errors.password = validationMessages.passwordTooShort.uk;
    }
    if (usernameStatus === "taken") errors.username = validationMessages.usernameTaken.uk;
    if (password !== confirmPassword) errors.confirmPassword = validationMessages.passwordsDontMatch.uk;

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data!.email,
      password: parsed.data!.password,
      options: { data: { username: parsed.data!.username } },
    });
    setSubmitting(false);

    if (error) {
      setFormError(authErrorMessage(error));
      return;
    }

    if (data.session) {
      // Immediate access — email confirmation is off (ARCHITECTURE.md §5).
      // New accounts go through avatar onboarding first (M3); returning
      // users logging in go straight to /home (below).
      router.push("/onboarding/avatar");
      router.refresh();
    } else {
      // Only reachable if email confirmation gets turned on later — the
      // flow degrades gracefully instead of assuming an immediate session.
      setInfoMessage(
        "Перевірте свою електронну пошту, щоб підтвердити реєстрацію.",
      );
    }
  }

  // Guest access: a real (but marked `is_anonymous: true`) Supabase Auth
  // session — the same auth system as everyone else, not a second one. The
  // username in metadata is required: the on_auth_user_created trigger
  // falls back to deriving one from `email` (COALESCE(...,
  // split_part(NEW.email, '@', 1) || ...)), and an anonymous user has no
  // email, so without this the insert would violate the NOT NULL
  // constraint on profiles.username and the whole sign-in would fail.
  async function handleGuest() {
    setFormError(null);
    setInfoMessage(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/guest", { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.tokenHash) {
        setSubmitting(false);
        setFormError("Гостьовий доступ тимчасово недоступний.");
        return;
      }

      // The server created the guest user and handed back a one-time
      // token; verifying it here is what actually establishes the real
      // Supabase session (cookies) in this browser — the same mechanism
      // as any other sign-in, just via a token instead of a password.
      const { error } = await supabase.auth.verifyOtp({
        token_hash: body.tokenHash,
        type: "email",
      });
      setSubmitting(false);

      if (error) {
        setFormError(authErrorMessage(error));
        return;
      }

      router.push("/home");
      router.refresh();
    } catch {
      setSubmitting(false);
      setFormError("Немає з’єднання з сервером. Перевірте інтернет-з’єднання.");
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setInfoMessage(null);

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setFieldErrors({ email: validationMessages.emailRequired.uk });
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    setSubmitting(false);

    if (error) {
      setFormError(authErrorMessage(error));
      return;
    }

    router.push("/home");
    router.refresh();
  }

  const transition = reduceMotion ? { duration: 0 } : { duration: 0.25, ease: "easeOut" as const };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0.15 : 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="mx-auto w-full max-w-sm rounded-3xl border border-white/15 bg-black/40 p-6 shadow-2xl backdrop-blur-xl">
      <div className="mb-6 flex rounded-full bg-white/5 p-1">
        <button
          type="button"
          onClick={() => switchMode("login")}
          className={`flex-1 rounded-full py-2 text-sm font-medium transition ${
            mode === "login" ? "bg-white text-black" : "text-white/60"
          }`}
        >
          Увійти
        </button>
        <button
          type="button"
          onClick={() => switchMode("register")}
          className={`flex-1 rounded-full py-2 text-sm font-medium transition ${
            mode === "register" ? "bg-white text-black" : "text-white/60"
          }`}
        >
          Реєстрація
        </button>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {mode === "login" ? (
          <motion.form
            key="login"
            onSubmit={handleLogin}
            initial={reduceMotion ? undefined : { opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, x: 8 }}
            transition={transition}
            className="space-y-4"
            noValidate
          >
            <div>
              <label className={labelClass} htmlFor="login-email">Email</label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                className={inputClass}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              {fieldErrors.email && <p className="mt-1 text-xs text-red-300">{fieldErrors.email}</p>}
            </div>
            <div>
              <label className={labelClass} htmlFor="login-password">Пароль</label>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                className={inputClass}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {formError && <p className="text-sm text-red-300">{formError}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-white py-3 text-sm font-semibold text-black transition disabled:opacity-50"
            >
              {submitting ? "Зачекайте…" : "Увійти"}
            </button>
          </motion.form>
        ) : (
          <motion.form
            key="register"
            onSubmit={handleRegister}
            initial={reduceMotion ? undefined : { opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, x: -8 }}
            transition={transition}
            className="space-y-4"
            noValidate
          >
            <div>
              <label className={labelClass} htmlFor="reg-username">Ім’я користувача</label>
              <input
                id="reg-username"
                type="text"
                autoComplete="username"
                className={inputClass}
                value={username}
                onChange={(e) => onUsernameChange(e.target.value)}
              />
              {usernameStatus === "checking" && <p className="mt-1 text-xs text-white/40">Перевірка…</p>}
              {usernameStatus === "taken" && (
                <p className="mt-1 text-xs text-red-300">{validationMessages.usernameTaken.uk}</p>
              )}
              {usernameStatus === "available" && (
                <p className="mt-1 text-xs text-emerald-300">Доступне</p>
              )}
              {fieldErrors.username && <p className="mt-1 text-xs text-red-300">{fieldErrors.username}</p>}
            </div>
            <div>
              <label className={labelClass} htmlFor="reg-email">Email</label>
              <input
                id="reg-email"
                type="email"
                autoComplete="email"
                className={inputClass}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              {fieldErrors.email && <p className="mt-1 text-xs text-red-300">{fieldErrors.email}</p>}
            </div>
            <div>
              <label className={labelClass} htmlFor="reg-password">Пароль</label>
              <input
                id="reg-password"
                type="password"
                autoComplete="new-password"
                className={inputClass}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {fieldErrors.password && <p className="mt-1 text-xs text-red-300">{fieldErrors.password}</p>}
            </div>
            <div>
              <label className={labelClass} htmlFor="reg-confirm">Підтвердження пароля</label>
              <input
                id="reg-confirm"
                type="password"
                autoComplete="new-password"
                className={inputClass}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              {fieldErrors.confirmPassword && (
                <p className="mt-1 text-xs text-red-300">{fieldErrors.confirmPassword}</p>
              )}
            </div>
            {formError && <p className="text-sm text-red-300">{formError}</p>}
            {infoMessage && <p className="text-sm text-emerald-300">{infoMessage}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-white py-3 text-sm font-semibold text-black transition disabled:opacity-50"
            >
              {submitting ? "Зачекайте…" : "Створити акаунт"}
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={handleGuest}
        disabled={submitting}
        className="mt-5 w-full text-center text-[13px] font-medium text-white/50 underline decoration-white/30 underline-offset-4 transition hover:text-white/80 disabled:opacity-50"
      >
        Зайти як гість
      </button>
    </motion.div>
  );
}
