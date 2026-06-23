import type { EditOperation, EditorStateDto, EditorTrackId, SongRegionDto } from "@ai-music/shared";
import { create } from "zustand";
import {
  isEditorStemsReady,
  setCachedEditorState,
} from "@/features/music-editor/utils/editor-session-cache";

export interface PreviewTrackState {
  gainDb: number;
  muted: boolean;
}

export interface PlaybackController {
  play: () => void;
  pause: () => void;
  stop: () => void;
  seek: (ms: number) => void;
  setZoom: (zoom: number) => void;
}

export interface StemMediaElements {
  vocal: HTMLAudioElement | null;
  instrumental: HTMLAudioElement | null;
}

export type TrackSelectionSource = "panel" | "timeline";

export interface TimelineSelectionSec {
  startSec: number;
  endSec: number;
}

export interface TimelineSelectionContext {
  regionId: string;
  layoutStartSec: number;
  layoutEndSec: number;
}

interface AudioEditorState {
  songId: string | null;
  selectedRegionId: string | null;
  selectedTrackId: EditorTrackId | null;
  linkedTracks: boolean;
  trackSelectionSource: TrackSelectionSource;
  regions: SongRegionDto[];
  tracks: EditorStateDto["tracks"];
  operations: EditOperation[];
  undoneOperations: EditOperation[];
  currentVersionId: string | null;
  versions: EditorStateDto["versions"];
  songStatus: EditorStateDto["song"]["status"] | null;
  editorNotice: string | null;
  durationMs: number;
  isBusy: boolean;
  error: string | null;

  isPlaying: boolean;
  currentTimeMs: number;
  zoom: number;
  loopSelected: boolean;
  previewTracks: Record<EditorTrackId, PreviewTrackState>;
  playbackController: PlaybackController | null;
  stemMedia: StemMediaElements;

  timelineSelectionSec: TimelineSelectionSec | null;
  timelineSelectionContext: TimelineSelectionContext | null;

  hydrate: (state: EditorStateDto) => void;
  setSelectedRegion: (id: string | null) => void;
  setSelectedTrack: (id: EditorTrackId | null) => void;
  selectTrackFromPanel: (id: EditorTrackId) => void;
  selectTrackFromTimeline: (id: EditorTrackId) => void;
  selectTimelineTarget: (regionId: string, trackId: EditorTrackId) => void;
  setLinkedTracks: (value: boolean) => void;
  setOperations: (operations: EditOperation[]) => void;
  setBusy: (value: boolean) => void;
  setError: (message: string | null) => void;

  setCurrentTime: (ms: number) => void;
  setDuration: (ms: number) => void;
  setZoom: (zoom: number) => void;
  setIsPlaying: (value: boolean) => void;
  togglePlay: () => void;
  stop: () => void;
  toggleLoopSelected: () => void;
  setPlaybackController: (controller: PlaybackController | null) => void;

  setPreviewGain: (trackId: EditorTrackId, gainDb: number) => void;
  setPreviewMute: (trackId: EditorTrackId, muted: boolean) => void;
  syncPreviewTracksFromOperations: () => void;
  togglePreviewMute: (trackId: EditorTrackId) => void;

  setStemMedia: (media: StemMediaElements) => void;

  setTimelineSelection: (
    selection: {
      sec: TimelineSelectionSec;
      context: TimelineSelectionContext | null;
    } | null,
  ) => void;
}

const DEFAULT_PREVIEW: PreviewTrackState = {
  gainDb: 0,
  muted: false,
};

function resolveSelectedRegionId(
  regions: SongRegionDto[],
  preferredId: string | null,
): string | null {
  if (preferredId && regions.some((region) => region.id === preferredId)) {
    return preferredId;
  }

  if (regions.length === 0) {
    return null;
  }

  return [...regions].sort((left, right) => left.orderIndex - right.orderIndex)[0]?.id ?? null;
}

function resolveDefaultTrackId(
  tracks: EditorStateDto["tracks"],
  preferredId: EditorTrackId | null,
): EditorTrackId | null {
  if (preferredId && tracks.some((track) => track.id === preferredId)) {
    return preferredId;
  }

  if (tracks.some((track) => track.id === "vocal")) {
    return "vocal";
  }

  return tracks[0]?.id ?? null;
}

export function resolvePreviewTracks(
  operations: EditOperation[],
  selectedRegionId: string | null,
): Record<EditorTrackId, PreviewTrackState> {
  const resolveTrack = (trackId: EditorTrackId): PreviewTrackState => {
    let gainDb = 0;
    let muted = false;

    if (selectedRegionId) {
      for (const operation of operations) {
        if (!("regionId" in operation) || operation.regionId !== selectedRegionId) {
          continue;
        }

        if (operation.type === "SET_VOLUME" && operation.trackId === trackId) {
          gainDb = operation.gainDb;
        }

        if (operation.type === "MUTE_TRACK" && operation.trackId === trackId) {
          muted = operation.muted;
        }
      }
    }

    return {
      gainDb,
      muted,
    };
  };

  return {
    vocal: resolveTrack("vocal"),
    instrumental: resolveTrack("instrumental"),
  };
}

export const useAudioEditorStore = create<AudioEditorState>((set, get) => ({
  songId: null,
  selectedRegionId: null,
  selectedTrackId: null,
  linkedTracks: false,
  trackSelectionSource: "timeline",
  regions: [],
  tracks: [],
  operations: [],
  undoneOperations: [],
  currentVersionId: null,
  versions: [],
  songStatus: null,
  editorNotice: null,
  durationMs: 0,
  isBusy: false,
  error: null,

  isPlaying: false,
  currentTimeMs: 0,
  zoom: 100,
  loopSelected: false,
  previewTracks: {
    vocal: { ...DEFAULT_PREVIEW },
    instrumental: { ...DEFAULT_PREVIEW },
  },
  playbackController: null,
  stemMedia: {
    vocal: null,
    instrumental: null,
  },

  timelineSelectionSec: null,
  timelineSelectionContext: null,

  hydrate: (state) => {
    if (isEditorStemsReady(state)) {
      setCachedEditorState(state.song.id, state);
    }

    set((current) => {
      const selectedRegionId = resolveSelectedRegionId(
        state.regions,
        current.selectedRegionId,
      );
      const selectedTrackId = resolveDefaultTrackId(state.tracks, current.selectedTrackId);
      const previewTracks = resolvePreviewTracks(state.operations, selectedRegionId);
      const muteOps = state.operations.filter(
        (op) => op.type === "MUTE_TRACK" && op.muted,
      );

      // #region agent log
      fetch("http://127.0.0.1:7689/ingest/393e7dad-6c29-4254-ab78-3b3c45dc5137", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "8d61d1" },
        body: JSON.stringify({
          sessionId: "8d61d1",
          hypothesisId: "C-D",
          location: "audio-editor-store.ts:hydrate",
          message: "editor hydrated preview tracks",
          data: {
            selectedRegionId,
            previewTracks,
            muteOpsCount: muteOps.length,
            muteOps: muteOps.map((op) =>
              op.type === "MUTE_TRACK"
                ? { trackId: op.trackId, regionId: op.regionId, muted: op.muted }
                : null,
            ),
          },
          timestamp: Date.now(),
        }),
      }).catch(() => undefined);
      // #endregion

      return {
        songId: state.song.id,
        regions: state.regions,
        tracks: state.tracks,
        operations: state.operations,
        undoneOperations: state.undoneOperations ?? [],
        currentVersionId: state.currentVersionId,
        versions: state.versions,
        songStatus: state.song.status,
        editorNotice: state.song.stemSeparationNotice ?? null,
        durationMs: state.song.durationMs ?? 0,
        selectedRegionId,
        selectedTrackId,
        previewTracks,
        error: null,
      };
    });
  },

  setSelectedRegion: (id) =>
    set((state) => ({
      selectedRegionId: id,
      previewTracks: resolvePreviewTracks(state.operations, id),
    })),
  setSelectedTrack: (id) => set({ selectedTrackId: id }),
  selectTrackFromPanel: (id) =>
    set({
      selectedTrackId: id,
      trackSelectionSource: "panel",
    }),
  selectTrackFromTimeline: (id) =>
    set({
      selectedTrackId: id,
      trackSelectionSource: "timeline",
    }),
  selectTimelineTarget: (regionId, trackId) =>
    set((state) => ({
      selectedRegionId: regionId,
      selectedTrackId: trackId,
      trackSelectionSource: "timeline",
      previewTracks: resolvePreviewTracks(state.operations, regionId),
    })),
  setLinkedTracks: (value) => set({ linkedTracks: value }),
  setOperations: (operations) => set({ operations, undoneOperations: [] }),
  setBusy: (value) => set({ isBusy: value }),
  setError: (message) => set({ error: message }),

  setCurrentTime: (ms) => set({ currentTimeMs: ms }),
  setDuration: (ms) => set({ durationMs: ms }),
  setZoom: (zoom) => {
    const nextZoom = Math.min(200, Math.max(10, zoom));
    set({ zoom: nextZoom });
    get().playbackController?.setZoom(nextZoom);
  },
  setIsPlaying: (value) => set({ isPlaying: value }),
  togglePlay: () => {
    const { isPlaying, playbackController } = get();

    if (!playbackController) {
      return;
    }

    if (isPlaying) {
      playbackController.pause();
      set({ isPlaying: false });
      return;
    }

    playbackController.play();
    set({ isPlaying: true });
  },
  stop: () => {
    get().playbackController?.stop();
    set({ isPlaying: false, currentTimeMs: 0 });
  },
  toggleLoopSelected: () => set((state) => ({ loopSelected: !state.loopSelected })),
  setPlaybackController: (controller) => set({ playbackController: controller }),

  setPreviewGain: (trackId, gainDb) =>
    set((state) => ({
      previewTracks: {
        ...state.previewTracks,
        [trackId]: { ...state.previewTracks[trackId], gainDb },
      },
    })),
  setPreviewMute: (trackId, muted) =>
    set((state) => {
      // #region agent log
      fetch("http://127.0.0.1:7689/ingest/393e7dad-6c29-4254-ab78-3b3c45dc5137", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "8d61d1" },
        body: JSON.stringify({
          sessionId: "8d61d1",
          hypothesisId: "C",
          location: "audio-editor-store.ts:setPreviewMute",
          message: "preview mute updated",
          data: {
            trackId,
            muted,
            selectedRegionId: state.selectedRegionId,
            previewTracks: state.previewTracks,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => undefined);
      // #endregion

      return {
        previewTracks: {
          ...state.previewTracks,
          [trackId]: { ...state.previewTracks[trackId], muted },
        },
      };
    }),
  syncPreviewTracksFromOperations: () =>
    set((state) => ({
      previewTracks: resolvePreviewTracks(state.operations, state.selectedRegionId),
    })),
  togglePreviewMute: (trackId) =>
    set((state) => ({
      previewTracks: {
        ...state.previewTracks,
        [trackId]: {
          ...state.previewTracks[trackId],
          muted: !state.previewTracks[trackId].muted,
        },
      },
    })),

  setStemMedia: (media) => set({ stemMedia: media }),

  setTimelineSelection: (selection) =>
    set(
      selection
        ? {
            timelineSelectionSec: selection.sec,
            timelineSelectionContext: selection.context,
          }
        : { timelineSelectionSec: null, timelineSelectionContext: null },
    ),
}));

export function selectSelectedRegion(state: AudioEditorState): SongRegionDto | null {
  if (!state.selectedRegionId) {
    return null;
  }

  return state.regions.find((region) => region.id === state.selectedRegionId) ?? null;
}

export function selectRegionLabel(region: SongRegionDto): string {
  return region.label.charAt(0).toUpperCase() + region.label.slice(1);
}

export function isTrackSelected(
  state: Pick<AudioEditorState, "linkedTracks" | "selectedTrackId">,
  trackId: EditorTrackId,
): boolean {
  return state.linkedTracks || state.selectedTrackId === trackId;
}
