"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ALLOWED_AVATAR_MIME_TYPES, MAX_AVATAR_BYTES } from "@/lib/validation/avatar";
import { uploadErrorMessages } from "@/lib/upload-errors";

export function AvatarOnboardingForm() {
  const router = useRouter();
  const t = useTranslations("Onboarding");
  const locale = useLocale() as "uk" | "en";
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  function onPick() {
    inputRef.current?.click();
  }

  function onFileSelected(selected: File | null) {
    setError(null);
    if (!selected) return;

    if (!ALLOWED_AVATAR_MIME_TYPES.includes(selected.type)) {
      setError(uploadErrorMessages.unsupportedType[locale]);
      return;
    }
    if (selected.size > MAX_AVATAR_BYTES) {
      setError(uploadErrorMessages.tooLarge[locale]);
      return;
    }

    setFile(selected);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(selected);
    });
  }

  async function handleSave() {
    if (!file) return;
    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("avatar", file);
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
        setError(uploadErrorMessages[key][locale]);
        setUploading(false);
        return;
      }

      router.push("/home");
      router.refresh();
    } catch {
      setError(uploadErrorMessages.network[locale]);
      setUploading(false);
    }
  }

  function handleSkip() {
    router.push("/home");
    router.refresh();
  }

  const displaySrc = previewUrl ?? "/images/user-photo.jpeg";

  return (
    <div className="w-full max-w-sm rounded-3xl border border-white/15 bg-black/40 p-6 text-center shadow-2xl backdrop-blur-xl">
      <h1 className="mb-1 text-lg font-semibold text-white">{t("title")}</h1>
      <p className="mb-6 text-sm text-white/60">{t("subtitle")}</p>

      <button
        type="button"
        onClick={onPick}
        className="group relative mx-auto mb-5 block h-32 w-32 overflow-hidden rounded-full border border-white/20"
      >
        <Image src={displaySrc} alt="" fill sizes="128px" className="object-cover" />
        <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-xs font-medium text-white opacity-0 transition group-hover:bg-black/40 group-hover:opacity-100">
          {t("choosePhoto")}
        </span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_AVATAR_MIME_TYPES.join(",")}
        className="hidden"
        onChange={(e) => onFileSelected(e.target.files?.[0] ?? null)}
      />

      {error && <p className="mb-4 text-sm text-red-300">{error}</p>}

      <div className="space-y-3">
        <button
          type="button"
          onClick={file ? handleSave : onPick}
          disabled={uploading}
          className="w-full rounded-xl bg-white py-3 text-sm font-semibold text-black transition disabled:opacity-50"
        >
          {uploading ? t("uploading") : file ? t("savePhoto") : t("chooseFromGallery")}
        </button>
        <button
          type="button"
          onClick={handleSkip}
          disabled={uploading}
          className="w-full rounded-xl border border-white/15 bg-transparent py-3 text-sm font-medium text-white/70 transition hover:bg-white/5 disabled:opacity-50"
        >
          {t("skip")}
        </button>
      </div>
    </div>
  );
}
