export type SongEditorStatus =
  | "pending_stems"
  | "separating_stems"
  | "ready"
  | "failed";

export type SongStemType = "vocal" | "instrumental";

export type SongRegionLabel =
  | "intro"
  | "verse"
  | "chorus"
  | "bridge"
  | "outro"
  | "custom";

export type EditorTrackId = "vocal" | "instrumental";

export interface SetVolumeOperation {
  type: "SET_VOLUME";
  trackId: EditorTrackId;
  regionId: string;
  gainDb: number;
}

export interface MuteTrackOperation {
  type: "MUTE_TRACK";
  trackId: EditorTrackId;
  regionId: string;
  muted: boolean;
}

export interface CutRegionOperation {
  type: "CUT_REGION";
  regionId: string;
}

export interface SplitRegionOperation {
  type: "SPLIT_REGION";
  regionId: string;
  splitAtMs: number;
}

export interface MoveRegionOperation {
  type: "MOVE_REGION";
  regionId: string;
  targetIndex: number;
}

export interface DuplicateRegionOperation {
  type: "DUPLICATE_REGION";
  regionId: string;
}

export interface FadeOperation {
  type: "FADE";
  trackId: EditorTrackId;
  regionId: string;
  fadeType: "in" | "out";
  durationMs: number;
}

export interface ReplaceVocalOperation {
  type: "REPLACE_VOCAL";
  regionId: string;
  voiceModelId: number;
}

export interface RegenerateRegionOperation {
  type: "REGENERATE_REGION";
  regionId: string;
  prompt: string;
}

export type EditOperation =
  | SetVolumeOperation
  | MuteTrackOperation
  | CutRegionOperation
  | SplitRegionOperation
  | MoveRegionOperation
  | DuplicateRegionOperation
  | FadeOperation
  | ReplaceVocalOperation
  | RegenerateRegionOperation;

export interface AiEditCommand {
  operation: EditOperation;
  confidence: number;
  explanation: string;
}

export interface SongStemDto {
  id: string;
  type: SongStemType;
  audioUrl: string;
  durationMs: number | null;
}

export interface SongRegionDto {
  id: string;
  label: SongRegionLabel;
  startMs: number;
  endMs: number;
  orderIndex: number;
  hasReplacement: boolean;
}

export interface SongPendingActionDto {
  action: "extend" | "regenerate" | null;
  taskId: string | null;
  regionId: string | null;
  status: "idle" | "processing" | "failed";
  message?: string | null;
}

export interface SongVersionDto {
  id: string;
  versionNumber: number;
  status: string;
  renderedAudioUrl: string | null;
  createdAt: string;
}

export interface SongDto {
  id: string;
  title: string;
  prompt: string;
  status: SongEditorStatus;
  durationMs: number | null;
  audioUrl: string | null;
  sourceTrackId: string;
  createdAt: string;
  updatedAt: string;
}

export interface AudioTrackDto {
  id: EditorTrackId;
  label: string;
  stemId: string | null;
  audioUrl: string | null;
  muted: boolean;
  gainDb: number;
}

export interface EditorStateDto {
  song: SongDto;
  stems: SongStemDto[];
  regions: SongRegionDto[];
  tracks: AudioTrackDto[];
  operations: EditOperation[];
  currentVersionId: string;
  versions: SongVersionDto[];
  pendingAction: SongPendingActionDto;
}

export interface ApplyOperationBody {
  operation: EditOperation;
  selectedRegionId?: string | null;
  selectedTrackId?: EditorTrackId | null;
}

export type PreviewOperationBody = ApplyOperationBody;

export interface VoiceTransferBody {
  regionId: string;
  voiceModelId: number;
}

export interface RenderSongResponse {
  renderJobId: string;
  songVersionId: string;
  status: string;
}

export interface InitEditorResponse {
  songId: string;
  status: SongEditorStatus;
}

export interface AiCommandBody {
  prompt: string;
  selectedRegionId?: string | null;
  selectedTrackId?: EditorTrackId | null;
  apply?: boolean;
}

export interface AiCommandResponse {
  command: AiEditCommand;
  applied: boolean;
  editorState?: EditorStateDto;
}

export interface ExtendSongBody {
  regionId: string;
  prompt?: string;
}

export interface RegenerateRegionBody {
  regionId: string;
  prompt: string;
}
