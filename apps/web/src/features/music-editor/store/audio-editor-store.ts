import type {
  EditOperation,
  EditorStateDto,
  EditorTrackId,
  SongRegionDto,
} from "@ai-music/shared";
import { create } from "zustand";

interface AudioEditorState {
  songId: string | null;
  selectedRegionId: string | null;
  selectedTrackId: EditorTrackId | null;
  regions: SongRegionDto[];
  tracks: EditorStateDto["tracks"];
  operations: EditOperation[];
  currentVersionId: string | null;
  versions: EditorStateDto["versions"];
  songStatus: EditorStateDto["song"]["status"] | null;
  durationMs: number | null;
  isBusy: boolean;
  error: string | null;

  hydrate: (state: EditorStateDto) => void;
  setSelectedRegion: (id: string | null) => void;
  setSelectedTrack: (id: EditorTrackId | null) => void;
  setOperations: (operations: EditOperation[]) => void;
  setBusy: (value: boolean) => void;
  setError: (message: string | null) => void;
  undo: () => void;
  redo: () => void;
}

export const useAudioEditorStore = create<AudioEditorState>((set, get) => ({
  songId: null,
  selectedRegionId: null,
  selectedTrackId: null,
  regions: [],
  tracks: [],
  operations: [],
  currentVersionId: null,
  versions: [],
  songStatus: null,
  durationMs: null,
  isBusy: false,
  error: null,

  hydrate: (state) => {
    set({
      songId: state.song.id,
      regions: state.regions,
      tracks: state.tracks,
      operations: state.operations,
      currentVersionId: state.currentVersionId,
      versions: state.versions,
      songStatus: state.song.status,
      durationMs: state.song.durationMs,
      error: null,
    });
  },

  setSelectedRegion: (id) => set({ selectedRegionId: id }),
  setSelectedTrack: (id) => set({ selectedTrackId: id }),
  setOperations: (operations) => set({ operations }),
  setBusy: (value) => set({ isBusy: value }),
  setError: (message) => set({ error: message }),

  undo: () => {
    const { operations } = get();

    if (operations.length === 0) {
      return;
    }

    set({ operations: operations.slice(0, -1) });
  },

  redo: () => {
    // Server is source of truth; redo requires persisted history (post-MVP).
  },
}));

export function selectSelectedRegion(state: AudioEditorState): SongRegionDto | null {
  if (!state.selectedRegionId) {
    return null;
  }

  return state.regions.find((region) => region.id === state.selectedRegionId) ?? null;
}
