export type CreditUnits = number;

export const CREDIT_UNIT_SCALE = 1000;

export const OPERATION_COST_UNITS = {
  generateText: 400,
  generateTrack: 12_000,
  stemSeparation: 10_000,
  replaceSection: 5_000,
  wavExport: 400,
} as const;

export const FULL_PRODUCTION_FLOW_UNITS =
  OPERATION_COST_UNITS.generateText +
  OPERATION_COST_UNITS.generateTrack +
  OPERATION_COST_UNITS.stemSeparation +
  OPERATION_COST_UNITS.replaceSection +
  OPERATION_COST_UNITS.wavExport;

export const FREE_DEMO_CREDITS = 50;
export const FREE_DEMO_CREDIT_UNITS = FREE_DEMO_CREDITS * CREDIT_UNIT_SCALE;

export function creditsToUnits(credits: number): CreditUnits {
  return Math.round(credits * CREDIT_UNIT_SCALE);
}

export function unitsToCredits(units: CreditUnits): number {
  return units / CREDIT_UNIT_SCALE;
}

export function formatCredits(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function formatCreditsFromUnits(units: CreditUnits): string {
  return formatCredits(unitsToCredits(units));
}
