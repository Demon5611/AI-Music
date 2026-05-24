import { PlaceholderPage } from "@/shared/ui/placeholder-page";

export default function VoicePage() {
  return (
    <PlaceholderPage
      title="Запись голоса"
      description="Запишите или загрузите образец голоса для voice transfer."
      actionHref="/consent"
      actionLabel="Далее: согласие"
    />
  );
}
