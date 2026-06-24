import type {
  TimedLyricsDisplayLine,
  TimedLyricsLine,
  TimedLyricsPayload,
  TimedLyricsWord,
} from "../types/timed-lyrics.js";

export interface AlignedLyricsWord {
  word: string;
  startS: number;
  endS: number;
}

const SECTION_MARKER_PATTERN = /^\[[^\]]+\]$/;

function isSectionMarker(text: string): boolean {
  return SECTION_MARKER_PATTERN.test(text.trim());
}

export function mapAlignedWordsToTimedWords(words: AlignedLyricsWord[]): TimedLyricsWord[] {
  return words
    .map((item) => ({
      text: item.word.trim(),
      startSec: item.startS,
      endSec: item.endS,
    }))
    .filter((item) => item.text.length > 0 && !isSectionMarker(item.text));
}

export function groupAlignedWordsToLines(words: AlignedLyricsWord[]): TimedLyricsLine[] {
  return groupWordsToDisplayLines(mapAlignedWordsToTimedWords(words)).map((line) => ({
    startSec: line.startSec,
    endSec: line.endSec,
    text: line.words.map((word) => word.text).join(" "),
  }));
}

export function groupWordsToDisplayLines(words: TimedLyricsWord[]): TimedLyricsDisplayLine[] {
  const lines: TimedLyricsDisplayLine[] = [];
  let currentWords: TimedLyricsWord[] = [];
  let lineStart = 0;
  let lineEnd = 0;

  const flush = () => {
    if (currentWords.length === 0) {
      return;
    }

    lines.push({
      startSec: lineStart,
      endSec: lineEnd,
      words: currentWords,
    });
    currentWords = [];
  };

  for (const item of words) {
    const segments = item.text.split("\n");

    for (let index = 0; index < segments.length; index += 1) {
      const segment = segments[index]?.trim() ?? "";

      if (index > 0) {
        flush();
      }

      if (!segment) {
        continue;
      }

      if (currentWords.length === 0) {
        lineStart = item.startSec;
      }

      currentWords.push({
        text: segment,
        startSec: item.startSec,
        endSec: item.endSec,
      });
      lineEnd = item.endSec;
    }
  }

  flush();

  return lines;
}

function parseTimedLyricsLine(item: unknown): TimedLyricsLine | null {
  if (
    typeof item !== "object" ||
    item === null ||
    typeof (item as TimedLyricsLine).startSec !== "number" ||
    typeof (item as TimedLyricsLine).endSec !== "number" ||
    typeof (item as TimedLyricsLine).text !== "string"
  ) {
    return null;
  }

  return {
    startSec: (item as TimedLyricsLine).startSec,
    endSec: (item as TimedLyricsLine).endSec,
    text: (item as TimedLyricsLine).text,
  };
}

function parseTimedLyricsWord(item: unknown): TimedLyricsWord | null {
  if (
    typeof item !== "object" ||
    item === null ||
    typeof (item as TimedLyricsWord).startSec !== "number" ||
    typeof (item as TimedLyricsWord).endSec !== "number" ||
    typeof (item as TimedLyricsWord).text !== "string"
  ) {
    return null;
  }

  return {
    startSec: (item as TimedLyricsWord).startSec,
    endSec: (item as TimedLyricsWord).endSec,
    text: (item as TimedLyricsWord).text,
  };
}

function parseTimedLyricsLinesArray(value: unknown[]): TimedLyricsLine[] | null {
  const lines: TimedLyricsLine[] = [];

  for (const item of value) {
    const line = parseTimedLyricsLine(item);

    if (!line) {
      return null;
    }

    lines.push(line);
  }

  return lines;
}

/** @deprecated Use parseTimedLyricsCache */
export function parseTimedLyricsJson(value: unknown): TimedLyricsLine[] | null {
  return parseTimedLyricsCache(value)?.lines ?? null;
}

export function parseTimedLyricsCache(value: unknown): TimedLyricsPayload | null {
  if (Array.isArray(value)) {
    const lines = parseTimedLyricsLinesArray(value);

    if (!lines) {
      return null;
    }

    return { lines };
  }

  if (typeof value !== "object" || value === null) {
    return null;
  }

  const record = value as { lines?: unknown; words?: unknown };
  const lines = Array.isArray(record.lines) ? parseTimedLyricsLinesArray(record.lines) : null;

  if (!lines) {
    return null;
  }

  const words = Array.isArray(record.words)
    ? record.words
        .map((item) => parseTimedLyricsWord(item))
        .filter((item): item is TimedLyricsWord => item !== null)
    : undefined;

  return {
    lines,
    words: words && words.length > 0 ? words : undefined,
  };
}

export function serializeTimedLyricsCache(payload: TimedLyricsPayload): {
  v: 2;
  lines: TimedLyricsLine[];
  words: TimedLyricsWord[];
} {
  return {
    v: 2,
    lines: payload.lines,
    words: payload.words ?? [],
  };
}

export function resolveTimedWordState(
  word: TimedLyricsWord,
  currentTimeSec: number,
): "past" | "active" | "upcoming" {
  if (currentTimeSec >= word.endSec) {
    return "past";
  }

  if (currentTimeSec >= word.startSec) {
    return "active";
  }

  return "upcoming";
}
