import type {
  AiCommandBody,
  AiCommandResponse,
  ApplyOperationBody,
  EditorStateDto,
  InitEditorResponse,
  RegenerateRegionBody,
  RenderSongResponse,
} from "@ai-music/shared";
import type { ApiClient } from "./client.js";

export function createMusicEditorApi(client: ApiClient) {
  return {
    initEditor: (trackId: string) =>
      client.post<InitEditorResponse>(`/api/music/tracks/${trackId}/editor`, {}),
    getSong: (songId: string) => client.get<EditorStateDto>(`/api/music/${songId}`),
    getEditorState: (songId: string) =>
      client.get<EditorStateDto>(`/api/music/${songId}/editor-state`),
    separateStems: (songId: string) =>
      client.post<EditorStateDto>(`/api/music/${songId}/separate-stems`, {}),
    applyOperation: (songId: string, body: ApplyOperationBody) =>
      client.post<EditorStateDto>(`/api/music/${songId}/operations`, body),
    undoLastOperation: (songId: string) =>
      client.post<EditorStateDto>(`/api/music/${songId}/operations/undo`, {}),
    redoLastOperation: (songId: string) =>
      client.post<EditorStateDto>(`/api/music/${songId}/operations/redo`, {}),
    previewOperation: (songId: string, body: ApplyOperationBody) =>
      client.post<{ valid: boolean; operation: ApplyOperationBody["operation"] }>(
        `/api/music/${songId}/preview-operation`,
        body,
      ),
    aiCommand: (songId: string, body: AiCommandBody) =>
      client.post<AiCommandResponse>(`/api/music/${songId}/ai-command`, body),
    regenerateRegion: (songId: string, body: RegenerateRegionBody) =>
      client.post<EditorStateDto>(`/api/music/${songId}/regenerate-region`, body),
    render: (songId: string) => client.post<RenderSongResponse>(`/api/music/${songId}/render`, {}),
    getRenderJob: (songId: string, jobId: string) =>
      client.get<{
        id: string;
        status: string;
        errorMessage: string | null;
      }>(`/api/music/${songId}/render/${jobId}`),
    voiceTransfer: (songId: string, body: { regionId: string; voiceModelId: number }) =>
      client.post<EditorStateDto>(`/api/music/${songId}/voice-transfer`, body),
  };
}
