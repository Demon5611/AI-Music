import type {
  EditOperation,
  EditorStateDto,
  EditorTrackId,
  SongPendingActionDto,
  SongRegionDto,
} from "@ai-music/shared";
import { create } from "zustand";

export interface PreviewTrackState {
  gainDb: number;
  muted: boolean;
  solo: boolean;
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

interface AudioEditorState {
  songId: string | null;
  selectedRegionId: string | null;
  selectedTrackId: EditorTrackId | null;
  regions: SongRegionDto[];
  tracks: EditorStateDto["tracks"];
  operations: EditOperation[];
  undoneOperations: EditOperation[];
  currentVersionId: string | null;
  versions: EditorStateDto["versions"];
  songStatus: EditorStateDto["song"]["status"] | null;
  pendingAction: SongPendingActionDto | null;
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

  aiCommandText: string;
  aiCommandPreview: EditOperation | null;

  hydrate: (state: EditorStateDto) => void;
  setSelectedRegion: (id: string | null) => void;
  setSelectedTrack: (id: EditorTrackId | null) => void;
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
  togglePreviewMute: (trackId: EditorTrackId) => void;
  togglePreviewSolo: (trackId: EditorTrackId) => void;

  setStemMedia: (media: StemMediaElements) => void;

  setAiCommandText: (value: string) => void;
  setAiCommandPreview: (operation: EditOperation | null) => void;
}

const DEFAULT_PREVIEW: PreviewTrackState = {
  gainDb: 0,
  muted: false,
  solo: false,
};

function resolvePreviewTracks(
  operations: EditOperation[],
  selectedRegionId: string | null,
  previous: Record<EditorTrackId, PreviewTrackState>,
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
      solo: previous[trackId].solo,
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
  regions: [],
  tracks: [],
  operations: [],
  undoneOperations: [],
  currentVersionId: null,
  versions: [],
  songStatus: null,
  pendingAction: null,
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

  aiCommandText: "",
  aiCommandPreview: null,

  hydrate: (state) => {
    set((current) => {
      const selectedRegionId =
        current.selectedRegionId &&
        state.regions.some((region) => region.id === current.selectedRegionId)
          ? current.selectedRegionId
          : null;

      return {
        songId: state.song.id,
        regions: state.regions,
        tracks: state.tracks,
        operations: state.operations,
        undoneOperations: state.undoneOperations ?? [],
        currentVersionId: state.currentVersionId,
        versions: state.versions,
        songStatus: state.song.status,
        pendingAction: state.pendingAction,
        durationMs: state.song.durationMs ?? 0,
        selectedRegionId,
        previewTracks: resolvePreviewTracks(
          state.operations,
          selectedRegionId,
          current.previewTracks,
        ),
        error: null,
      };
    });
  },

  setSelectedRegion: (id) => set({ selectedRegionId: id }),
  setSelectedTrack: (id) => set({ selectedTrackId: id }),
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
  togglePreviewSolo: (trackId) =>
    set((state) => {
      const isSolo = !state.previewTracks[trackId].solo;

      return {
        previewTracks: {
          vocal: {
            ...state.previewTracks.vocal,
            solo: trackId === "vocal" ? isSolo : false,
          },
          instrumental: {
            ...state.previewTracks.instrumental,
            solo: trackId === "instrumental" ? isSolo : false,
          },
        },
      };
    }),

  setStemMedia: (media) => set({ stemMedia: media }),

  setAiCommandText: (value) => set({ aiCommandText: value }),
  setAiCommandPreview: (operation) => set({ aiCommandPreview: operation }),
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
