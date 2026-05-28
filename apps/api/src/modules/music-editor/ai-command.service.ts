import type {
  AiCommandBody,
  AiEditCommand,
  EditOperation,
  EditorTrackId,
} from "@ai-music/shared";
import { AiEditCommandSchema } from "@ai-music/shared";
import { BadRequestError } from "../../common/errors.js";
import { applyOperation } from "./operation.service.js";
import { toEditorStateDto } from "./song-editor.mapper.js";
import { getCurrentVersion, getSongForUser } from "./song-editor.service.js";

interface ParseContext {
  selectedRegionId: string | null;
  selectedTrackId: EditorTrackId | null;
  regionStartMs?: number;
  regionEndMs?: number;
}

function normalizePrompt(prompt: string): string {
  return prompt.trim().toLowerCase();
}

function requireRegionId(context: ParseContext): string {
  if (!context.selectedRegionId) {
    throw new BadRequestError("Выберите регион на timeline");
  }

  return context.selectedRegionId;
}

function buildVolumeCommand(
  context: ParseContext,
  trackId: EditorTrackId,
  gainDb: number,
  explanation: string,
): AiEditCommand {
  return {
    operation: {
      type: "SET_VOLUME",
      trackId,
      regionId: requireRegionId(context),
      gainDb,
    },
    confidence: 0.9,
    explanation,
  };
}

export function parseNaturalLanguageCommand(
  prompt: string,
  context: ParseContext,
): AiEditCommand {
  const text = normalizePrompt(prompt);

  if (
    /(голос|vocal).*(тише|quiet|lower|reduce)/.test(text) ||
    /(тише|quiet).*(голос|vocal)/.test(text)
  ) {
    return buildVolumeCommand(
      context,
      "vocal",
      -3,
      "Понижаю громкость вокала в выбранном регионе",
    );
  }

  if (
    /(музык|instrument|inst|beat).*(тише|quiet|lower|reduce)/.test(text) ||
    /(тише|quiet).*(музык|instrument|inst|beat)/.test(text)
  ) {
    return buildVolumeCommand(
      context,
      "instrumental",
      -3,
      "Понижаю громкость инструментала в выбранном регионе",
    );
  }

  if (/(убрать|remove|mute|заглуш).*(вокал|vocal)/.test(text)) {
    return {
      operation: {
        type: "MUTE_TRACK",
        trackId: "vocal",
        regionId: requireRegionId(context),
        muted: true,
      },
      confidence: 0.92,
      explanation: "Заглушаю вокал в выбранном регионе",
    };
  }

  if (/^split|раздел|разбей/.test(text)) {
    const regionId = requireRegionId(context);

    if (!context.regionEndMs || context.regionStartMs === undefined) {
      throw new BadRequestError("Не удалось определить границы региона");
    }

    const splitAtMs = Math.round(
      (context.regionStartMs + context.regionEndMs) / 2,
    );

    return {
      operation: {
        type: "SPLIT_REGION",
        regionId,
        splitAtMs,
      },
      confidence: 0.88,
      explanation: "Делю выбранный регион пополам",
    };
  }

  if (/duplicate|дублир/.test(text)) {
    return {
      operation: {
        type: "DUPLICATE_REGION",
        regionId: requireRegionId(context),
      },
      confidence: 0.88,
      explanation: "Дублирую выбранный регион",
    };
  }

  if (/fade in|затухан.*вход|нараст/.test(text)) {
    const trackId = context.selectedTrackId ?? "vocal";
    return {
      operation: {
        type: "FADE",
        trackId,
        regionId: requireRegionId(context),
        fadeType: "in",
        durationMs: 800,
      },
      confidence: 0.86,
      explanation: "Добавляю fade in для выбранного региона",
    };
  }

  if (/fade out|затухан.*выход|затух/.test(text)) {
    const trackId = context.selectedTrackId ?? "vocal";
    return {
      operation: {
        type: "FADE",
        trackId,
        regionId: requireRegionId(context),
        fadeType: "out",
        durationMs: 800,
      },
      confidence: 0.86,
      explanation: "Добавляю fade out для выбранного региона",
    };
  }

  if (/(влево|left|назад)/.test(text)) {
    return {
      operation: {
        type: "MOVE_REGION",
        regionId: requireRegionId(context),
        targetIndex: 0,
      },
      confidence: 0.75,
      explanation: "Сдвигаю регион влево по порядку",
    };
  }

  if (/(вправо|right|впер)/.test(text)) {
    return {
      operation: {
        type: "MOVE_REGION",
        regionId: requireRegionId(context),
        targetIndex: 999,
      },
      confidence: 0.75,
      explanation: "Сдвигаю регион вправо по порядку",
    };
  }

  throw new BadRequestError(
    "Не удалось распознать команду. Попробуйте: «сделай голос тише», «убрать вокал», «split», «fade in».",
  );
}

export function normalizeMoveTargetIndex(
  operation: EditOperation,
  regionCount: number,
): EditOperation {
  if (operation.type !== "MOVE_REGION") {
    return operation;
  }

  if (operation.targetIndex >= regionCount) {
    return {
      ...operation,
      targetIndex: Math.max(0, regionCount - 1),
    };
  }

  return operation;
}

export async function executeAiCommand(
  userId: string,
  songId: string,
  body: AiCommandBody,
) {
  const song = await getSongForUser(userId, songId);
  const region = body.selectedRegionId
    ? song.regions.find((item) => item.id === body.selectedRegionId)
    : null;

  const parsed = parseNaturalLanguageCommand(body.prompt, {
    selectedRegionId: body.selectedRegionId ?? null,
    selectedTrackId: body.selectedTrackId ?? null,
    regionStartMs: region?.startMs,
    regionEndMs: region?.endMs,
  });

  let operation = normalizeMoveTargetIndex(
    parsed.operation,
    song.regions.length,
  );

  if (operation.type === "MOVE_REGION" && body.selectedRegionId) {
    const currentIndex = song.regions.findIndex(
      (item) => item.id === body.selectedRegionId,
    );

    if (operation.targetIndex === 0 && currentIndex > 0) {
      operation = { ...operation, targetIndex: currentIndex - 1 };
    }

    if (operation.targetIndex >= song.regions.length - 1) {
      operation = {
        ...operation,
        targetIndex: Math.min(currentIndex + 1, song.regions.length - 1),
      };
    }
  }

  const command = AiEditCommandSchema.parse({
    ...parsed,
    operation,
  });

  if (!body.apply) {
    return { command, applied: false };
  }

  const updatedSong = await applyOperation(
    userId,
    songId,
    command.operation,
    {
      selectedRegionId: body.selectedRegionId,
      selectedTrackId: body.selectedTrackId,
    },
  );

  const version = await getCurrentVersion(updatedSong.id);

  return {
    command,
    applied: true,
    editorState: toEditorStateDto(updatedSong, version),
  };
}
