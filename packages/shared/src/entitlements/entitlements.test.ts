import {
  checkFeature,
  checkProjectLimit,
  checkVersionHistoryOperationLimit,
  resolveEntitlements,
} from "./index.js";
import { resolveMaxProjects } from "../constants/plans.js";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function runEntitlementsChecks(): void {
  assert(resolveMaxProjects("free") === 3, "free maxProjects = 3");
  assert(resolveMaxProjects("pro") === 10, "pro maxProjects = 10");
  assert(resolveMaxProjects("studio") === 100, "studio maxProjects = 100");

  assert(resolveEntitlements("pro").maxProjects === 10, "resolved pro maxProjects");
  assert(resolveEntitlements("studio").features.wavExport === true, "studio wavExport");
  assert(resolveEntitlements("pro").features.wavExport === false, "pro wavExport off");
  assert(resolveEntitlements("studio").features.aiRemix === true, "studio aiRemix");
  assert(resolveEntitlements("free").features.aiRemix === false, "free aiRemix off");

  const freeRemix = checkFeature("free", "aiRemix");
  assert(!freeRemix.ok && freeRemix.requiredPlan === "studio", "free aiRemix blocked");

  const freeAtLimit = checkProjectLimit("free", 3);

  const proAtLimit = checkProjectLimit("pro", 10);
  assert(!proAtLimit.ok && proAtLimit.requiredPlan === "studio", "pro project limit upsell studio");

  const proUnderLimit = checkProjectLimit("pro", 9);
  assert(proUnderLimit.ok, "pro under project limit allowed");

  const freeUndoLimit = checkVersionHistoryOperationLimit("free", 100);
  assert(freeUndoLimit.ok, "free skips undo op limit");

  const proUnderOps = checkVersionHistoryOperationLimit("pro", 49);
  assert(proUnderOps.ok, "pro under undo op limit");

  const proAtOps = checkVersionHistoryOperationLimit("pro", 50);
  assert(!proAtOps.ok && proAtOps.code === "VERSION_HISTORY_LIMIT_EXCEEDED", "pro at undo limit");

  const studioUnlimited = checkVersionHistoryOperationLimit("studio", 500);
  assert(studioUnlimited.ok, "studio unlimited undo ops");
}

runEntitlementsChecks();
