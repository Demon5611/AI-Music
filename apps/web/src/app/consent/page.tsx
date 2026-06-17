import { Suspense } from "react";
import { SunoVoiceVerifyPanel } from "@/features/voice/suno-voice-verify-panel";

export default function ConsentPage() {
  return (
    <Suspense fallback={<p>Загрузка...</p>}>
      <SunoVoiceVerifyPanel />
    </Suspense>
  );
}
