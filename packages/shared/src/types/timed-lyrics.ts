export interface TimedLyricsLine {
  startSec: number;
  endSec: number;
  text: string;
}

export interface TimedLyricsResponseDto {
  lines: TimedLyricsLine[];
  cached: boolean;
}
