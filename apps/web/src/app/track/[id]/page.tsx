import { PlaceholderPage } from "@/shared/ui/placeholder-page";

interface TrackPageProps {
  params: Promise<{ id: string }>;
}

export default async function TrackPage({ params }: TrackPageProps) {
  const { id } = await params;

  return (
    <PlaceholderPage
      title="Результат"
      description={`Плеер и share для трека ${id}.`}
      actionHref={`/share/${id}`}
      actionLabel="Поделиться"
    />
  );
}
