import { prisma } from "@ai-music/db";
import { InsufficientCreditsError } from "../../common/errors.js";

export async function getCreditsBalance(userId: string): Promise<number> {
  const result = await prisma.creditTransaction.aggregate({
    where: { userId },
    _sum: { amount: true },
  });

  return result._sum.amount ?? 0;
}

export async function spendCredits(
  userId: string,
  amount: number,
  reason: string,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const result = await tx.creditTransaction.aggregate({
      where: { userId },
      _sum: { amount: true },
    });
    const balance = result._sum.amount ?? 0;

    if (balance < amount) {
      throw new InsufficientCreditsError();
    }

    await tx.creditTransaction.create({
      data: {
        userId,
        type: "spend",
        amount: -amount,
        reason,
      },
    });
  });
}

export async function refundCredits(
  userId: string,
  amount: number,
  reason: string,
): Promise<void> {
  await prisma.creditTransaction.create({
    data: {
      userId,
      type: "refund",
      amount,
      reason,
    },
  });
}
