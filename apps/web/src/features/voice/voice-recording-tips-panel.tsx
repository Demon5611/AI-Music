import {
  KITS_VOICE_RECORDING_TIPS,
  SUNO_VOICE_VERIFY_TIPS,
} from "@/features/voice/voice-recording-tips";
import { voiceUi } from "@/features/voice/voice-classes";

export function VoiceRecordingTipsPanel() {
  return (
    <aside
      aria-label="Как корректно записать голос"
      className={voiceUi.recordingTips}
    >
      <p className={voiceUi.recordingTipsTitle}>
        Как корректно записать голос
      </p>
      <ul className={voiceUi.recordingTipsList}>
        {KITS_VOICE_RECORDING_TIPS.map((tip) => (
          <li key={tip}>{tip}</li>
        ))}
      </ul>
    </aside>
  );
}

export function SunoVoiceVerifyTipsPanel() {
  return (
    <aside
      aria-label="Как записать фразу верификации"
      className={voiceUi.recordingTips}
    >
      <p className={voiceUi.recordingTipsTitle}>
        Как записать фразу верификации
      </p>
      <ul className={voiceUi.recordingTipsList}>
        {SUNO_VOICE_VERIFY_TIPS.map((tip) => (
          <li key={tip}>{tip}</li>
        ))}
      </ul>
    </aside>
  );
}
