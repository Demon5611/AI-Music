import {
  getCreditsBalance as getLedgerBalance,
  getCreditsBalanceUnits as getLedgerBalanceUnits,
  InsufficientCreditsLedgerError,
  refundCredits as refundLedgerCredits,
  refundCreditsOnce as refundLedgerCreditsOnce,
  spendCredits as spendLedgerCredits,
  spendCreditsOnce as spendLedgerCreditsOnce,
} from "@ai-music/db";
import { InsufficientCreditsError } from "../../common/errors.js";

export async function getCreditsBalance(userId: string): Promise<number> {
  return getLedgerBalance(userId);
}

export async function getCreditsBalanceUnits(userId: string): Promise<number> {
  return getLedgerBalanceUnits(userId);
}

export async function spendCredits(
  userId: string,
  amountUnits: number,
  reason: string,
): Promise<void> {
  try {
    await spendLedgerCredits(userId, amountUnits, reason);
  } catch (error) {
    if (error instanceof InsufficientCreditsLedgerError) {
      throw new InsufficientCreditsError();
    }

    throw error;
  }
}

export async function spendCreditsOnce(
  userId: string,
  amountUnits: number,
  reason: string,
): Promise<boolean> {
  try {
    return await spendLedgerCreditsOnce(userId, amountUnits, reason);
  } catch (error) {
    if (error instanceof InsufficientCreditsLedgerError) {
      throw new InsufficientCreditsError();
    }

    throw error;
  }
}

export async function refundCredits(
  userId: string,
  amountUnits: number,
  reason: string,
): Promise<void> {
  await refundLedgerCredits(userId, amountUnits, reason);
}

export async function refundCreditsOnce(
  userId: string,
  amountUnits: number,
  reason: string,
): Promise<boolean> {
  return refundLedgerCreditsOnce(userId, amountUnits, reason);
}
