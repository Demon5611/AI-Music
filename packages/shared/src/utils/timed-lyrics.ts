import type { TimedLyricsLine } from "../types/timed-lyrics.js";

export interface AlignedLyricsWord {
  word: string;
  startS: number;
  endS: number;
}

const SECTION_MARKER_PATTERN = /^\[[^\]]+\]$/;

export function groupAlignedWordsToLines(words: AlignedLyricsWord[]): TimedLyricsLine[] {
  const lines: TimedLyricsLine[] = [];
  let buffer = "";
  let lineStart = 0;
  let lineEnd = 0;

  const flush = () => {
    const text = buffer.trim();

    if (text && !SECTION_MARKER_PATTERN.test(text)) {
      lines.push({
        startSec: lineStart,
        endSec: lineEnd,
        text,
      });
    }

    buffer = "";
  };

  for (const item of words) {
    const segments = item.word.split("\n");

    for (let index = 0; index < segments.length; index += 1) {
      const segment = segments[index]?.trim() ?? "";

      if (index > 0) {
        flush();
      }

      if (!segment) {
        continue;
      }

      if (!buffer) {
        lineStart = item.startS;
      }

      buffer = buffer ? `${buffer} ${segment}` : segment;
      lineEnd = item.endS;
    }
  }

  flush();

  return lines;
}

export function parseTimedLyricsJson(value: unknown): TimedLyricsLine[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const lines: TimedLyricsLine[] = [];

  for (const item of value) {
    if (
      typeof item !== "object" ||
      item === null ||
      typeof (item as TimedLyricsLine).startSec !== "number" ||
      typeof (item as TimedLyricsLine).endSec !== "number" ||
      typeof (item as TimedLyricsLine).text !== "string"
    ) {
      return null;
    }

    lines.push({
      startSec: (item as TimedLyricsLine).startSec,
      endSec: (item as TimedLyricsLine).endSec,
      text: (item as TimedLyricsLine).text,
    });
  }

  return lines;
}
