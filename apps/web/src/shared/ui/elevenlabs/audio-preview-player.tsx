"use client";

import { useEffect } from "react";
import {
  AudioPlayerButton,
  AudioPlayerProgress,
  AudioPlayerProvider,
  AudioPlayerTime,
  useAudioPlayer,
} from "@/components/ui/audio-player";
import { Skeleton } from "@/components/ui/skeleton";
import { AuthenticatedBlobUrl } from "@/shared/ui/authenticated-blob-url";
import styles from "@/shared/ui/elevenlabs/elevenlabs-ui.module.css";

interface AudioPreviewPlayerProps {
  src: string;
  className?: string;
}

function AudioPreviewControls({ playbackUrl }: { playbackUrl: string }) {
  const player = useAudioPlayer();

  useEffect(() => {
    void player.setActiveItem({ id: playbackUrl, src: playbackUrl });
  }, [playbackUrl, player]);

  return (
    <div className={styles.audioPreview}>
      <AudioPlayerButton variant="outline" size="icon-sm" />
      <div className={styles.audioPreviewTimeline}>
        <AudioPlayerProgress />
      </div>
      <div className={styles.audioPreviewTime}>
        <AudioPlayerTime />
      </div>
    </div>
  );
}

export function AudioPreviewPlayer({ src, className }: AudioPreviewPlayerProps) {
  return (
    <div className={className}>
      <AuthenticatedBlobUrl src={src}>
        {(playbackUrl) => {
          if (!playbackUrl) {
            return <Skeleton className={styles.playerSkeleton} />;
          }

          return (
            <AudioPlayerProvider>
              <AudioPreviewControls playbackUrl={playbackUrl} />
            </AudioPlayerProvider>
          );
        }}
      </AuthenticatedBlobUrl>
    </div>
  );
}
