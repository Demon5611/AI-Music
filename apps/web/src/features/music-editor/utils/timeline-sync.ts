import type WaveSurfer from "wavesurfer.js";
import { useAudioEditorStore } from "@/features/music-editor/store/audio-editor-store";

export function msToProgress(currentTimeMs: number, durationMs: number): number {
  if (durationMs <= 0) {
    return 0;
  }

  return Math.min(1, Math.max(0, currentTimeMs / durationMs));
}

export function progressToMs(progress: number, durationMs: number): number {
  return Math.round(Math.min(1, Math.max(0, progress)) * durationMs);
}

export function clampTimeMs(timeMs: number, durationMs: number): number {
  if (durationMs <= 0) {
    return Math.max(0, timeMs);
  }

  return Math.min(durationMs, Math.max(0, timeMs));
}

export function seekTimeline(timeMs: number): void {
  const { durationMs, setCurrentTime, playbackController } =
    useAudioEditorStore.getState();
  const clamped = clampTimeMs(timeMs, durationMs);

  setCurrentTime(clamped);
  playbackController?.seek(clamped);
}

export function resolveClickTimeMs(
  clientX: number,
  scrollElement: HTMLElement,
  durationMs: number,
): number {
  const rect = scrollElement.getBoundingClientRect();
  const x = clientX - rect.left + scrollElement.scrollLeft;
  const progress = x / Math.max(scrollElement.scrollWidth, 1);

  return progressToMs(progress, durationMs);
}

export function getWaveSurferScrollElement(wavesurfer: WaveSurfer): HTMLElement {
  const wrapper = wavesurfer.getWrapper();
  const scrollElement = wrapper.parentElement;

  return scrollElement ?? wrapper;
}

export function resolveWaveSurferClickTimeMs(
  wavesurfer: WaveSurfer,
  clientX: number,
): number {
  const durationMs = Math.round(wavesurfer.getDuration() * 1000);

  if (durationMs <= 0) {
    return 0;
  }

  return resolveClickTimeMs(
    clientX,
    getWaveSurferScrollElement(wavesurfer),
    durationMs,
  );
}

export function scrollToPlayhead(
  scrollElement: HTMLElement,
  currentTimeMs: number,
  durationMs: number,
): void {
  if (durationMs <= 0) {
    return;
  }

  const progress = msToProgress(currentTimeMs, durationMs);
  const targetScroll =
    progress * scrollElement.scrollWidth - scrollElement.clientWidth / 2;

  scrollElement.scrollLeft = Math.max(
    0,
    Math.min(targetScroll, scrollElement.scrollWidth - scrollElement.clientWidth),
  );
}
