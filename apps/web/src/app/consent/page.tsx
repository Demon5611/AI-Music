import { Suspense } from "react";
import { KitsModelLinkPanel } from "@/features/voice/kits-model-link-panel";

export default function ConsentPage() {
  return (
    <Suspense fallback={<p>Загрузка...</p>}>
      <KitsModelLinkPanel />
    </Suspense>
  );
}
