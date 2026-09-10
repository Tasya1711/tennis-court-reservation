type Bilingual = { uk: string; en: string };

export const uploadErrorMessages = {
  unsupportedType: {
    uk: "Непідтримуваний формат файлу. Використайте JPEG, PNG або WebP.",
    en: "Unsupported file type. Use JPEG, PNG, or WebP.",
  },
  tooLarge: {
    uk: "Файл завеликий. Максимальний розмір — 5 МБ.",
    en: "File is too large. Maximum size is 5MB.",
  },
  invalidImage: {
    uk: "Не вдалося обробити зображення. Спробуйте інший файл.",
    en: "Couldn't process this image. Try a different file.",
  },
  uploadFailed: {
    uk: "Не вдалося завантажити фото. Спробуйте ще раз.",
    en: "Upload failed. Please try again.",
  },
  unauthorized: {
    uk: "Сесія закінчилася. Увійдіть знову.",
    en: "Your session expired. Please log in again.",
  },
  network: {
    uk: "Немає з’єднання з сервером. Перевірте інтернет-з’єднання.",
    en: "Couldn't reach the server. Check your connection.",
  },
} satisfies Record<string, Bilingual>;
