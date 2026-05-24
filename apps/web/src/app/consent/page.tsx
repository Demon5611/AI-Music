import { PlaceholderPage } from "@/shared/ui/placeholder-page";

export default function ConsentPage() {
  return (
    <PlaceholderPage
      title="Согласие на использование голоса"
      description="Подтвердите, что используете свой голос для создания трека."
      actionHref="/create"
      actionLabel="К созданию"
    />
  );
}
