import type {
  ApplyOperationBody,
  EditorStateDto,
  InitEditorResponse,
  KitsVoiceModel,
  KitsVoiceModelsResponse,
  RenderSongResponse,
} from "@ai-music/shared";
import type { ApiClient } from "./client.js";

export interface ListKitsVoiceModelsParams {
  myModels?: boolean;
  page?: number;
  perPage?: number;
}

function buildVoiceModelsQuery(params: ListKitsVoiceModelsParams): string {
  const search = new URLSearchParams();

  if (params.myModels) {
    search.set("myModels", "true");
  }

  if (params.page) {
    search.set("page", String(params.page));
  }

  if (params.perPage) {
    search.set("perPage", String(params.perPage));
  }

  const query = search.toString();
  return query ? `?${query}` : "";
}

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
    render: (songId: string) => client.post<RenderSongResponse>(`/api/music/${songId}/render`, {}),
    getRenderJob: (songId: string, jobId: string) =>
      client.get<{
        id: string;
        status: string;
        errorMessage: string | null;
      }>(`/api/music/${songId}/render/${jobId}`),
    voiceTransfer: (songId: string, body: { regionId: string; voiceModelId: number }) =>
      client.post<EditorStateDto>(`/api/music/${songId}/voice-transfer`, body),
    listKitsVoiceModels: (params: ListKitsVoiceModelsParams = {}) =>
      client.get<KitsVoiceModelsResponse>(
        `/api/music-editor/kits-voice-models${buildVoiceModelsQuery(params)}`,
      ),
    getKitsVoiceModel: (id: number) =>
      client.get<KitsVoiceModel>(`/api/music-editor/kits-voice-models/${id}`),
  };
}
