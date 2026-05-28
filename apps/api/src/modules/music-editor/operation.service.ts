import type { EditOperation, EditorTrackId } from "@ai-music/shared";
import { prisma, Prisma } from "@ai-music/db";
import { BadRequestError, NotFoundError } from "../../common/errors.js";
import { getCurrentVersion, getSongForUser } from "./song-editor.service.js";

interface SelectionContext {
  selectedRegionId?: string | null;
  selectedTrackId?: EditorTrackId | null;
}

export function validateOperationSelection(
  operation: EditOperation,
  context: SelectionContext,
): void {
  const { selectedRegionId, selectedTrackId } = context;

  if (selectedRegionId && "regionId" in operation) {
    if (operation.regionId !== selectedRegionId) {
      throw new BadRequestError(
        "AI command cannot modify a region outside the current selection",
        "SELECTION_MISMATCH",
      );
    }
  }

  if (selectedTrackId && "trackId" in operation) {
    if (operation.trackId !== selectedTrackId) {
      throw new BadRequestError(
        "AI command cannot modify a track outside the current selection",
        "SELECTION_MISMATCH",
      );
    }
  }
}

export async function applyRegionMutation(
  songId: string,
  operation: EditOperation,
): Promise<void> {
  const regions = await prisma.songRegion.findMany({
    where: { songId },
    orderBy: { orderIndex: "asc" },
  });

  const regionMap = new Map(regions.map((region) => [region.id, region]));

  switch (operation.type) {
    case "CUT_REGION": {
      const region = regionMap.get(operation.regionId);

      if (!region) {
        throw new NotFoundError("Region not found");
      }

      await prisma.songRegion.delete({ where: { id: region.id } });
      await reindexRegions(songId);
      return;
    }

    case "SPLIT_REGION": {
      const region = regionMap.get(operation.regionId);

      if (!region) {
        throw new NotFoundError("Region not found");
      }

      if (
        operation.splitAtMs <= region.startMs ||
        operation.splitAtMs >= region.endMs
      ) {
        throw new BadRequestError("splitAtMs must be inside the region");
      }

      await prisma.songRegion.update({
        where: { id: region.id },
        data: {
          endMs: operation.splitAtMs,
          label: "custom",
        },
      });

      await prisma.songRegion.create({
        data: {
          songId,
          label: "custom",
          startMs: operation.splitAtMs,
          endMs: region.endMs,
          orderIndex: region.orderIndex + 1,
        },
      });

      await reindexRegions(songId);
      return;
    }

    case "MOVE_REGION": {
      const sorted = regions.slice().sort((a, b) => a.orderIndex - b.orderIndex);
      const fromIndex = sorted.findIndex((item) => item.id === operation.regionId);

      if (fromIndex < 0) {
        throw new NotFoundError("Region not found");
      }

      const targetIndex = Math.min(operation.targetIndex, sorted.length - 1);
      const [moved] = sorted.splice(fromIndex, 1);
      sorted.splice(targetIndex, 0, moved);

      await Promise.all(
        sorted.map((region, index) =>
          prisma.songRegion.update({
            where: { id: region.id },
            data: { orderIndex: index },
          }),
        ),
      );
      return;
    }

    case "DUPLICATE_REGION": {
      const region = regionMap.get(operation.regionId);

      if (!region) {
        throw new NotFoundError("Region not found");
      }

      await prisma.songRegion.create({
        data: {
          songId,
          label: region.label,
          startMs: region.startMs,
          endMs: region.endMs,
          orderIndex: region.orderIndex + 1,
        },
      });

      await reindexRegions(songId);
      return;
    }

    default:
      return;
  }
}

async function reindexRegions(songId: string): Promise<void> {
  const regions = await prisma.songRegion.findMany({
    where: { songId },
    orderBy: { orderIndex: "asc" },
  });

  await Promise.all(
    regions.map((region, index) =>
      prisma.songRegion.update({
        where: { id: region.id },
        data: { orderIndex: index },
      }),
    ),
  );
}

export async function applyOperation(
  userId: string,
  songId: string,
  operation: EditOperation,
  context: SelectionContext,
) {
  validateOperationSelection(operation, context);

  const song = await getSongForUser(userId, songId);

  if (song.status !== "ready") {
    throw new BadRequestError("Song editor is not ready yet");
  }

  if ("regionId" in operation) {
    const regionExists = song.regions.some(
      (region) => region.id === operation.regionId,
    );

    if (!regionExists) {
      throw new NotFoundError("Region not found");
    }
  }

  await applyRegionMutation(songId, operation);

  const version = await getCurrentVersion(songId);

  await prisma.editOperation.create({
    data: {
      songVersionId: version.id,
      operationType: operation.type,
      payloadJson: operation as unknown as Prisma.InputJsonValue,
    },
  });

  return getSongForUser(userId, songId);
}

export async function previewOperation(
  userId: string,
  songId: string,
  operation: EditOperation,
  context: SelectionContext,
) {
  validateOperationSelection(operation, context);

  const song = await getSongForUser(userId, songId);

  if ("regionId" in operation) {
    const regionExists = song.regions.some(
      (region) => region.id === operation.regionId,
    );

    if (!regionExists) {
      throw new NotFoundError("Region not found");
    }
  }

  return {
    valid: true,
    operation,
    songId: song.id,
  };
}
