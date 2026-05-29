import { prisma, Prisma } from "@ai-music/db";
import type { DbEditOperation } from "./song-editor.mapper.js";

type EditOperationUndoUpdate = {
  undoneAt: Date | null;
  payloadJson?: Prisma.InputJsonValue;
};

function activeOperationWhere(versionId: string): Prisma.EditOperationWhereInput {
  return {
    songVersionId: versionId,
    undoneAt: null,
  } as Prisma.EditOperationWhereInput;
}

function undoneOperationWhere(versionId: string): Prisma.EditOperationWhereInput {
  return {
    songVersionId: versionId,
    undoneAt: { not: null },
  } as Prisma.EditOperationWhereInput;
}

function toUpdateInput(data: EditOperationUndoUpdate): Prisma.EditOperationUpdateInput {
  return data as Prisma.EditOperationUpdateInput;
}

export async function clearUndoneOperations(versionId: string): Promise<void> {
  await prisma.editOperation.deleteMany({
    where: undoneOperationWhere(versionId),
  });
}

export async function findLastActiveOperation(
  versionId: string,
): Promise<DbEditOperation | null> {
  return prisma.editOperation.findFirst({
    where: activeOperationWhere(versionId),
    orderBy: { createdAt: "desc" },
  });
}

export async function markOperationUndone(operationId: string): Promise<void> {
  await prisma.editOperation.update({
    where: { id: operationId },
    data: toUpdateInput({ undoneAt: new Date() }),
  });
}

export async function findLastUndoneOperation(
  versionId: string,
): Promise<DbEditOperation | null> {
  return prisma.editOperation.findFirst({
    where: undoneOperationWhere(versionId),
    orderBy: { undoneAt: "desc" } as Prisma.EditOperationOrderByWithRelationInput,
  });
}

export async function restoreUndoneOperation(
  operationId: string,
  payloadJson: Prisma.InputJsonValue,
): Promise<void> {
  await prisma.editOperation.update({
    where: { id: operationId },
    data: toUpdateInput({
      undoneAt: null,
      payloadJson,
    }),
  });
}
