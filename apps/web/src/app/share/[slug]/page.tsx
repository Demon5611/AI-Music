import { PlaceholderPage } from "@/shared/ui/placeholder-page";

interface SharePageProps {
  params: Promise<{ slug: string }>;
}

export default async function SharePage({ params }: SharePageProps) {
  const { slug } = await params;

  return (
    <PlaceholderPage
      title="Публичная ссылка"
      description={`Публичная страница трека: ${slug}.`}
      actionHref="/"
      actionLabel="На главную"
    />
  );
}
