import { prisma } from "./prisma.js";

export class InsufficientCreditsLedgerError extends Error {
  constructor() {
    super("Insufficient credits");
    this.name = "InsufficientCreditsLedgerError";
  }
}

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
      throw new InsufficientCreditsLedgerError();
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

export async function grantCredits(
  userId: string,
  amount: number,
  reason: string,
  stripePaymentId?: string,
): Promise<boolean> {
  if (stripePaymentId) {
    const existing = await prisma.creditTransaction.findFirst({
      where: { stripePaymentId },
    });

    if (existing) {
      return false;
    }
  }

  await prisma.creditTransaction.create({
    data: {
      userId,
      type: "purchase",
      amount,
      reason,
      stripePaymentId: stripePaymentId ?? null,
    },
  });

  return true;
}
