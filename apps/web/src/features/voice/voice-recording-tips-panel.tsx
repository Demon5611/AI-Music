import {
  KITS_RECORDING_DOCS_URL,
  KITS_VOICE_RECORDING_TIPS,
} from "@/features/voice/voice-recording-tips";
import { voiceUi } from "@/features/voice/voice-classes";

export function VoiceRecordingTipsPanel() {
  return (
    <aside
      aria-label="Как записать голос для корректной подмены через Kits"
      className={voiceUi.recordingTips}
    >
      <p className={voiceUi.recordingTipsTitle}>
        Как записать голос для лучшей подмены
      </p>
      <ul className={voiceUi.recordingTipsList}>
        {KITS_VOICE_RECORDING_TIPS.map((tip) => (
          <li key={tip}>{tip}</li>
        ))}
      </ul>
      <a
        className={voiceUi.recordingTipsLink}
        href={KITS_RECORDING_DOCS_URL}
        rel="noopener noreferrer"
        target="_blank"
      >
        Подробнее в документации Kits
      </a>
    </aside>
  );
}
