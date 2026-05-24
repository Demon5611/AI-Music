import { PlaceholderPage } from "@/shared/ui/placeholder-page";

export default function CreatePage() {
  return (
    <PlaceholderPage
      title="Создать трек"
      description="Введите prompt и выберите музыкальный стиль."
      actionHref="/voice"
      actionLabel="Далее: голос"
    />
  );
}
