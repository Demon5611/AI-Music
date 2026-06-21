import { config } from "dotenv";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import Stripe from "stripe";
import { PAID_PLAN_IDS, PLANS, type PaidPlanId } from "@ai-music/shared";

const repoRoot = resolve(import.meta.dirname, "../../..");
const envPath = resolve(repoRoot, ".env");

config({ path: envPath });

const APP_METADATA_KEY = "app";
const APP_METADATA_VALUE = "ai-music";
const PLAN_METADATA_KEY = "planId";

function getStripe(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();

  if (!secretKey) {
    console.error("STRIPE_SECRET_KEY is missing in .env");
    process.exit(1);
  }

  return new Stripe(secretKey);
}

function planProductName(planId: PaidPlanId): string {
  return `AI Music ${PLANS[planId].label}`;
}

function planDescription(planId: PaidPlanId): string {
  const plan = PLANS[planId];
  return `${plan.monthlyCredits} credits/month, up to ${plan.maxTrackDurationSec}s tracks`;
}

async function findExistingPriceId(
  stripe: Stripe,
  planId: PaidPlanId,
): Promise<string | null> {
  const products = await stripe.products.search({
    query: `active:'true' AND metadata['${APP_METADATA_KEY}']:'${APP_METADATA_VALUE}' AND metadata['${PLAN_METADATA_KEY}']:'${planId}'`,
    limit: 1,
  });

  const product = products.data[0];

  if (!product?.default_price) {
    return null;
  }

  return typeof product.default_price === "string"
    ? product.default_price
    : product.default_price.id;
}

async function ensurePlanPrice(stripe: Stripe, planId: PaidPlanId): Promise<string> {
  const existingPriceId = await findExistingPriceId(stripe, planId);

  if (existingPriceId) {
    console.log(`[ok] ${planId}: ${existingPriceId} (existing)`);
    return existingPriceId;
  }

  const plan = PLANS[planId];
  const product = await stripe.products.create({
    name: planProductName(planId),
    description: planDescription(planId),
    metadata: {
      [APP_METADATA_KEY]: APP_METADATA_VALUE,
      [PLAN_METADATA_KEY]: planId,
    },
    default_price_data: {
      currency: "usd",
      unit_amount: plan.priceUsd * 100,
      recurring: { interval: "month" },
      metadata: {
        [APP_METADATA_KEY]: APP_METADATA_VALUE,
        [PLAN_METADATA_KEY]: planId,
      },
    },
  });

  const priceId =
    typeof product.default_price === "string"
      ? product.default_price
      : product.default_price?.id;

  if (!priceId) {
    throw new Error(`Stripe did not return default price for plan ${planId}`);
  }

  console.log(`[created] ${planId}: ${priceId}`);
  return priceId;
}

function upsertEnvPriceIds(priceIds: Record<PaidPlanId, string>): void {
  if (!existsSync(envPath)) {
    console.error(`.env not found at ${envPath}`);
    process.exit(1);
  }

  let content = readFileSync(envPath, "utf8");

  for (const planId of PAID_PLAN_IDS) {
    const key = `STRIPE_PRICE_${planId.toUpperCase()}`;
    const value = priceIds[planId];
    const line = `${key}=${value}`;
    const pattern = new RegExp(`^${key}=.*$`, "m");

    if (pattern.test(content)) {
      content = content.replace(pattern, line);
    } else {
      const stripeBlock = content.match(/# Stripe[\s\S]*?(?=\n# |\n$)/);

      if (stripeBlock) {
        content = content.replace(stripeBlock[0], `${stripeBlock[0].trimEnd()}\n${line}\n`);
      } else {
        content = `${content.trimEnd()}\n${line}\n`;
      }
    }
  }

  writeFileSync(envPath, content, "utf8");
  console.log("\nUpdated .env with STRIPE_PRICE_* values.");
}

async function main(): Promise<void> {
  const stripe = getStripe();
  const account = await stripe.accounts.retrieve();

  console.log(`Stripe account: ${account.id}`);
  console.log("Ensuring subscription products/prices for paid plans...\n");

  const priceIds = {} as Record<PaidPlanId, string>;

  for (const planId of PAID_PLAN_IDS) {
    priceIds[planId] = await ensurePlanPrice(stripe, planId);
  }

  upsertEnvPriceIds(priceIds);

  console.log("\nNext steps (local test mode):");
  console.log("1. Install Stripe CLI: brew install stripe/stripe-cli/stripe");
  console.log("2. Login: stripe login");
  console.log(
    "3. Forward webhooks: stripe listen --forward-to localhost:3001/api/billing/webhook",
  );
  console.log("4. Copy whsec_... from CLI output into STRIPE_WEBHOOK_SECRET in .env");
  console.log("5. Restart API: pnpm dev:api");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
