import { getTranslations } from "next-intl/server";
import { ErrorScreen } from "@/components/error/ErrorScreen";

export default async function NotFound() {
  const t = await getTranslations("Errors");

  return (
    <ErrorScreen
      code="404"
      title={t("notFoundTitle")}
      message={t("notFoundMessage")}
    />
  );
}
