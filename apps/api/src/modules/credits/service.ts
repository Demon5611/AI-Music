import {
  getCreditsBalance as getLedgerBalance,
  InsufficientCreditsLedgerError,
  refundCredits as refundLedgerCredits,
  spendCredits as spendLedgerCredits,
} from "@ai-music/db";
import { InsufficientCreditsError } from "../../common/errors.js";

export async function getCreditsBalance(userId: string): Promise<number> {
  return getLedgerBalance(userId);
}

export async function spendCredits(
  userId: string,
  amount: number,
  reason: string,
): Promise<void> {
  try {
    await spendLedgerCredits(userId, amount, reason);
  } catch (error) {
    if (error instanceof InsufficientCreditsLedgerError) {
      throw new InsufficientCreditsError();
    }

    throw error;
  }
}

export async function refundCredits(
  userId: string,
  amount: number,
  reason: string,
): Promise<void> {
  await refundLedgerCredits(userId, amount, reason);
}
