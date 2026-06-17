import {
  KITS_VOICE_RECORDING_TIPS,
} from "@/features/voice/voice-recording-tips";
import { voiceUi } from "@/features/voice/voice-classes";

export function VoiceRecordingTipsPanel() {
  return (
    <aside
      aria-label="ККак корректно записать голос"
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
