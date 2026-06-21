import { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";

const CREDIT_UNIT_SCALE = 1000;

export class InsufficientCreditsLedgerError extends Error {
  constructor() {
    super("Insufficient credits");
    this.name = "InsufficientCreditsLedgerError";
  }
}

export async function getCreditsBalance(userId: string): Promise<number> {
  return (await getCreditsBalanceUnits(userId)) / CREDIT_UNIT_SCALE;
}

export async function getCreditsBalanceUnits(userId: string): Promise<number> {
  const result = await prisma.creditTransaction.aggregate({
    where: { userId },
    _sum: { amountUnits: true },
  });

  return result._sum.amountUnits ?? 0;
}

export async function spendCredits(
  userId: string,
  amountUnits: number,
  reason: string,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const result = await tx.creditTransaction.aggregate({
      where: { userId },
      _sum: { amountUnits: true },
    });
    const balanceUnits = result._sum.amountUnits ?? 0;

    if (balanceUnits < amountUnits) {
      throw new InsufficientCreditsLedgerError();
    }

    await tx.creditTransaction.create({
      data: {
        userId,
        type: "spend",
        amountUnits: -amountUnits,
        reason,
      },
    });
  });
}

export async function spendCreditsOnce(
  userId: string,
  amountUnits: number,
  reason: string,
): Promise<boolean> {
  try {
    await prisma.$transaction(async (tx) => {
      const result = await tx.creditTransaction.aggregate({
        where: { userId },
        _sum: { amountUnits: true },
      });
      const balanceUnits = result._sum.amountUnits ?? 0;

      if (balanceUnits < amountUnits) {
        throw new InsufficientCreditsLedgerError();
      }

      await tx.creditTransaction.create({
        data: {
          userId,
          type: "spend",
          amountUnits: -amountUnits,
          reason,
          idempotencyKey: reason,
        },
      });
    });

    return true;
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return false;
    }

    throw error;
  }
}

export async function refundCredits(
  userId: string,
  amountUnits: number,
  reason: string,
): Promise<void> {
  await prisma.creditTransaction.create({
    data: {
      userId,
      type: "refund",
      amountUnits,
      reason,
    },
  });
}

export async function refundCreditsOnce(
  userId: string,
  amountUnits: number,
  reason: string,
): Promise<boolean> {
  try {
    await prisma.creditTransaction.create({
      data: {
        userId,
        type: "refund",
        amountUnits,
        reason,
        idempotencyKey: reason,
      },
    });

    return true;
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return false;
    }

    throw error;
  }
}

export async function grantCredits(
  userId: string,
  amountUnits: number,
  reason: string,
  stripePaymentId?: string,
): Promise<boolean> {
  try {
    await prisma.creditTransaction.create({
      data: {
        userId,
        type: "purchase",
        amountUnits,
        reason,
        stripePaymentId: stripePaymentId ?? null,
      },
    });

    return true;
  } catch (error) {
    if (
      stripePaymentId &&
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return false;
    }

    throw error;
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}
