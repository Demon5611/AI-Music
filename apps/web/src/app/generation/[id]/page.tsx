import { PlaceholderPage } from "@/shared/ui/placeholder-page";

interface GenerationPageProps {
  params: Promise<{ id: string }>;
}

export default async function GenerationPage({ params }: GenerationPageProps) {
  const { id } = await params;

  return (
    <PlaceholderPage
      title="Генерация"
      description={`Статус генерации job ${id}. Progress UI будет в Sprint 3.`}
      actionHref="/profile"
      actionLabel="Профиль"
    />
  );
}
