"use client";

import { CollapsibleLyrics } from "@/shared/ui/collapsible-lyrics";
import {
  KaraokeLyricsView,
  KaraokeToggle,
  KaraokeUpgradeHint,
} from "@/shared/ui/karaoke/karaoke-lyrics-view";
import { karaokeUi } from "@/shared/ui/karaoke/karaoke-classes";
import { useKaraokeEnabled } from "@/shared/hooks/use-karaoke-enabled";
import { useTimedLyrics } from "@/shared/hooks/use-timed-lyrics";
import { useSubscriptionQuery } from "@/features/billing/hooks/use-subscription-query";
import { parseApiError } from "@/shared/lib/parse-api-error";
import { ShimmeringText } from "@/components/ui/shimmering-text";

interface TrackKaraokeSectionProps {
  trackId?: string;
  lyricsText?: string | null;
  currentTimeSec: number;
  defaultExpanded?: boolean;
}

export function TrackKaraokeSection({
  trackId,
  lyricsText,
  currentTimeSec,
  defaultExpanded = true,
}: TrackKaraokeSectionProps) {
  const { enabled, setEnabled } = useKaraokeEnabled();
  const subscriptionQuery = useSubscriptionQuery();
  const canUseKaraoke =
    subscriptionQuery.data?.entitlements.features.karaokeSync === true;
  const timedLyricsQuery = useTimedLyrics(trackId, enabled && canUseKaraoke);

  if (!lyricsText?.trim()) {
    return null;
  }

  const handleToggle = () => {
    setEnabled(!enabled);
  };

  return (
    <div className={karaokeUi.section}>
      <div className={karaokeUi.header}>
        <span className={karaokeUi.label}>Текст песни</span>
        <KaraokeToggle
          canUseKaraoke={canUseKaraoke}
          disabled={!trackId}
          enabled={enabled}
          onToggle={handleToggle}
        />
      </div>

      {!canUseKaraoke ? <KaraokeUpgradeHint /> : null}

      {enabled && canUseKaraoke ? (
        timedLyricsQuery.isLoading ? (
          <ShimmeringText className={karaokeUi.status} text="Синхронизируем текст..." />
        ) : timedLyricsQuery.isError ? (
          <p className={karaokeUi.error}>
            {parseApiError(timedLyricsQuery.error, "Не удалось загрузить Karaoke Sync")}
          </p>
        ) : timedLyricsQuery.data?.lines.length ? (
          <KaraokeLyricsView
            currentTimeSec={currentTimeSec}
            lines={timedLyricsQuery.data.lines}
            words={timedLyricsQuery.data.words}
          />
        ) : (
          <p className={karaokeUi.status}>Текст с таймкодами пока недоступен.</p>
        )
      ) : (
        <CollapsibleLyrics defaultExpanded={defaultExpanded} text={lyricsText} />
      )}
    </div>
  );
}
