interface MusicApiErrorResponse {
  error?: string;
  code?: string;
}

export async function readMusicApiError(response: Response): Promise<string> {
  let body: MusicApiErrorResponse = {};

  try {
    body = (await response.json()) as MusicApiErrorResponse;
  } catch {
    // Non-JSON error body.
  }

  if (body.error) {
    return body.code ? `${body.error} (${body.code})` : body.error;
  }

  return `Music API error: HTTP ${response.status}`;
}

export interface MusicTrackDto {
  id: string;
  title: string;
  audioUrl: string;
  imageUrl?: string;
  durationSec?: number;
  lyricsText?: string;
}

export interface MusicStatusDto {
  taskId: string;
  status: "pending" | "processing" | "completed" | "failed";
  provider: string;
  tracks?: MusicTrackDto[];
  lyrics?: Array<{ title: string; text: string }>;
  errorMessage?: string;
}

export interface MusicGenerateDto {
  provider: string;
  taskId: string;
  status: string;
}
