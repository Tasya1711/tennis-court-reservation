import { ErrorScreen } from "@/components/error/ErrorScreen";

export default function NotFound() {
  return (
    <ErrorScreen
      code="404"
      title="Сторінку не знайдено"
      message="Такої сторінки не існує або її було переміщено."
    />
  );
}
