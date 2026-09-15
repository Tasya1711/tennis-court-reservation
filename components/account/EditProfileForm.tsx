"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ALLOWED_AVATAR_MIME_TYPES, MAX_AVATAR_BYTES } from "@/lib/validation/avatar";
import { uploadErrorMessages } from "@/lib/upload-errors";
import { usernameSchema } from "@/lib/validation/auth";
import { validationMessages } from "@/lib/auth-errors";

// Same photo-picking mechanics as AvatarOnboardingForm (components/onboarding/
// AvatarOnboardingForm.tsx) — this is that same flow made available again
// after registration, not a different implementation. Avatar and nickname
// save independently: uploading a new photo doesn't require touching the
// nickname and vice versa, since POST /api/profile/avatar and
// PATCH /api/profile are two separate, already-idempotent endpoints.
export function EditProfileForm({
  initialAvatarUrl,
  initialUsername,
}: {
  initialAvatarUrl: string | null;
  initialUsername: string;
}) {
  const router = useRouter();
  const t = useTranslations("AccountEdit");
  const locale = useLocale() as "uk" | "en";
  const inputRef = useRef<HTMLInputElement>(null);
  const usernameCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [username, setUsername] = useState(initialUsername);
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "taken" | "available">("idle");
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [savingUsername, setSavingUsername] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  function onPick() {
    inputRef.current?.click();
  }

  function onFileSelected(selected: File | null) {
    setAvatarError(null);
    if (!selected) return;

    if (!ALLOWED_AVATAR_MIME_TYPES.includes(selected.type)) {
      setAvatarError(uploadErrorMessages.unsupportedType[locale]);
      return;
    }
    if (selected.size > MAX_AVATAR_BYTES) {
      setAvatarError(uploadErrorMessages.tooLarge[locale]);
      return;
    }

    setPendingFile(selected);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(selected);
    });
  }

  async function handleAvatarSave() {
    if (!pendingFile) return;
    setUploadingAvatar(true);
    setAvatarError(null);

    try {
      const formData = new FormData();
      formData.append("avatar", pendingFile);
      const res = await fetch("/api/profile/avatar", { method: "POST", body: formData });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const key = body.error === "unsupported_type"
          ? "unsupportedType"
          : body.error === "too_large"
            ? "tooLarge"
            : body.error === "invalid_image"
              ? "invalidImage"
              : body.error === "unauthorized"
                ? "unauthorized"
                : "uploadFailed";
        setAvatarError(uploadErrorMessages[key][locale]);
        setUploadingAvatar(false);
        return;
      }

      const { avatarUrl: newAvatarUrl } = await res.json();
      setAvatarUrl(newAvatarUrl);
      setPreviewUrl(null);
      setPendingFile(null);
      setUploadingAvatar(false);
      router.refresh();
    } catch {
      setAvatarError(uploadErrorMessages.network[locale]);
      setUploadingAvatar(false);
    }
  }

  function onUsernameChange(value: string) {
    setUsername(value);
    setUsernameError(null);
    setSavedMessage(null);
    if (usernameCheckTimer.current) clearTimeout(usernameCheckTimer.current);

    if (value === initialUsername) {
      setUsernameStatus("idle");
      return;
    }
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

  async function handleUsernameSave(e: React.FormEvent) {
    e.preventDefault();
    setUsernameError(null);
    setSavedMessage(null);

    if (username === initialUsername) return;

    const parsed = usernameSchema.safeParse(username);
    if (!parsed.success) {
      setUsernameError(validationMessages.usernameFormat[locale]);
      return;
    }
    if (usernameStatus === "taken") {
      setUsernameError(validationMessages.usernameTaken[locale]);
      return;
    }

    setSavingUsername(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: parsed.data }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setUsernameError(
          body.error === "username_taken" ? validationMessages.usernameTaken[locale] : validationMessages.usernameFormat[locale],
        );
        setSavingUsername(false);
        return;
      }

      setSavingUsername(false);
      setSavedMessage(t("saved"));
      router.refresh();
    } catch {
      setUsernameError(uploadErrorMessages.network[locale]);
      setSavingUsername(false);
    }
  }

  const displaySrc = previewUrl ?? avatarUrl ?? "/images/user-photo.jpeg";
  const usernameChanged = username !== initialUsername;

  return (
    <div className="w-full max-w-sm">
      <div className="text-center">
        <button
          type="button"
          onClick={onPick}
          className="group relative mx-auto mb-3 block h-28 w-28 overflow-hidden rounded-full border border-white/20"
        >
          <Image src={displaySrc} alt="" fill sizes="112px" className="object-cover" />
          <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-xs font-medium text-white opacity-0 transition group-hover:bg-black/40 group-hover:opacity-100">
            {t("changePhoto")}
          </span>
        </button>

        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_AVATAR_MIME_TYPES.join(",")}
          className="hidden"
          onChange={(e) => onFileSelected(e.target.files?.[0] ?? null)}
        />

        {avatarError && <p className="mb-2 text-sm text-red-300">{avatarError}</p>}

        {pendingFile && (
          <button
            type="button"
            onClick={handleAvatarSave}
            disabled={uploadingAvatar}
            className="mb-2 rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-black transition disabled:opacity-50"
          >
            {uploadingAvatar ? t("uploading") : t("savePhoto")}
          </button>
        )}
      </div>

      <form onSubmit={handleUsernameSave} className="mt-6 space-y-4">
        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-white/70" htmlFor="edit-username">
            {t("usernameLabel")}
          </label>
          <input
            id="edit-username"
            type="text"
            autoComplete="username"
            className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-[15px] text-white placeholder:text-white/40 outline-none backdrop-blur-sm transition focus:border-white/40 focus:bg-white/10"
            value={username}
            onChange={(e) => onUsernameChange(e.target.value)}
          />
          {usernameChanged && usernameStatus === "checking" && (
            <p className="mt-1 text-xs text-white/40">{t("checkingUsername")}</p>
          )}
          {usernameChanged && usernameStatus === "taken" && (
            <p className="mt-1 text-xs text-red-300">{validationMessages.usernameTaken[locale]}</p>
          )}
          {usernameChanged && usernameStatus === "available" && (
            <p className="mt-1 text-xs text-emerald-300">{t("usernameAvailable")}</p>
          )}
          {usernameError && <p className="mt-1 text-xs text-red-300">{usernameError}</p>}
        </div>

        {savedMessage && <p className="text-sm text-emerald-300">{savedMessage}</p>}

        <button
          type="submit"
          disabled={!usernameChanged || savingUsername || usernameStatus === "taken"}
          className="w-full rounded-xl bg-white py-3 text-sm font-semibold text-black transition disabled:opacity-50"
        >
          {savingUsername ? t("saving") : t("saveName")}
        </button>
      </form>
    </div>
  );
}
