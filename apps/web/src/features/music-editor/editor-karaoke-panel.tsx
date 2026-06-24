"use client";

import { TrackKaraokeSection } from "@/shared/ui/karaoke/track-karaoke-section";
import { useAudioEditorStore } from "@/features/music-editor/store/audio-editor-store";
import { me } from "@/features/music-editor/music-editor-classes";

export function EditorKaraokePanel() {
  const trackId = useAudioEditorStore((state) => state.sourceTrackId);
  const lyricsText = useAudioEditorStore((state) => state.sourceLyricsText);
  const currentTimeMs = useAudioEditorStore((state) => state.currentTimeMs);

  if (!trackId || !lyricsText?.trim()) {
    return null;
  }

  return (
    <div className={me.panel}>
      <h3 className={me.panelTitle}>Karaoke Sync</h3>
      <TrackKaraokeSection
        currentTimeSec={currentTimeMs / 1000}
        defaultExpanded={false}
        lyricsText={lyricsText}
        trackId={trackId}
      />
    </div>
  );
}
