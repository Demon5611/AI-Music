import Stripe from "stripe";
import { grantCredits } from "@ai-music/db";
import {
  PAID_PLAN_IDS,
  PLANS,
  creditsToUnits,
  type PaidPlanId,
  type PlanId,
} from "@ai-music/shared";
import { BadRequestError } from "../../common/errors.js";
import {
  findSubscriptionByStripeSubscriptionId,
  getOrCreateSubscription,
  updateSubscriptionPlan,
} from "./subscription.service.js";
import {
  getInvoiceLinePlanId,
  getInvoiceLinePriceId,
  getInvoiceSubscriptionId,
  getSubscriptionPeriodEnd,
} from "./stripe-event-helpers.js";

let stripeClient: Stripe | null = null;

function getStripe(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();

  if (!secretKey) {
    throw new BadRequestError("Stripe не настроен", "STRIPE_NOT_CONFIGURED");
  }

  if (!stripeClient) {
    stripeClient = new Stripe(secretKey);
  }

  return stripeClient;
}

function getWebOrigin(): string {
  return process.env.WEB_ORIGIN ?? "http://localhost:3000";
}

function resolvePriceId(planId: PaidPlanId): string {
  const envKey = `STRIPE_PRICE_${planId.toUpperCase()}` as const;
  const priceId = process.env[envKey]?.trim();

  if (!priceId) {
    throw new BadRequestError(`Stripe price для ${planId} не настроен`, "STRIPE_NOT_CONFIGURED");
  }

  return priceId;
}

function resolvePlanIdFromPriceId(priceId: string): PaidPlanId | null {
  for (const planId of PAID_PLAN_IDS) {
    if (resolvePriceId(planId) === priceId) {
      return planId;
    }
  }

  return null;
}

function mapStripeStatus(status: Stripe.Subscription.Status): string {
  if (status === "active" || status === "trialing") {
    return status;
  }

  if (status === "past_due" || status === "unpaid") {
    return "past_due";
  }

  return "canceled";
}

export async function createCheckoutSession(userId: string, planId: PaidPlanId) {
  const stripe = getStripe();
  const subscription = await getOrCreateSubscription(userId);
  const priceId = resolvePriceId(planId);

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: subscription.stripeCustomerId ?? undefined,
    client_reference_id: userId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${getWebOrigin()}/pricing?checkout=success`,
    cancel_url: `${getWebOrigin()}/pricing?checkout=cancel`,
    metadata: {
      userId,
      planId,
    },
    subscription_data: {
      metadata: {
        userId,
        planId,
      },
    },
  });

  if (!session.url) {
    throw new BadRequestError("Не удалось создать Stripe Checkout session");
  }

  return { url: session.url };
}

export async function createPortalSession(userId: string) {
  const stripe = getStripe();
  const subscription = await getOrCreateSubscription(userId);

  if (!subscription.stripeCustomerId) {
    throw new BadRequestError("Нет активной подписки Stripe");
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: subscription.stripeCustomerId,
    return_url: `${getWebOrigin()}/profile`,
  });

  return { url: session.url };
}

export async function handleStripeWebhook(rawBody: Buffer, signature: string) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();

  if (!webhookSecret) {
    throw new BadRequestError("Stripe webhook secret не настроен", "STRIPE_NOT_CONFIGURED");
  }

  const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);

  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
      break;
    case "invoice.paid":
      await handleInvoicePaid(event.data.object as Stripe.Invoice);
      break;
    case "customer.subscription.updated":
      await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
      break;
    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;
    default:
      break;
  }

  return { received: true };
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId ?? session.client_reference_id;

  if (!userId || session.mode !== "subscription") {
    return;
  }

  const stripeSubscriptionId =
    typeof session.subscription === "string" ? session.subscription : session.subscription?.id;

  const stripeCustomerId =
    typeof session.customer === "string" ? session.customer : session.customer?.id;

  const planId = resolvePlanIdFromMetadata(session.metadata?.planId);

  await updateSubscriptionPlan(userId, {
    planId,
    status: "active",
    stripeCustomerId: stripeCustomerId ?? null,
    stripeSubscriptionId: stripeSubscriptionId ?? null,
  });
}

async function resolveSubscriptionForInvoicePaid(
  stripe: Stripe,
  stripeSubscriptionId: string,
) {
  const existing = await findSubscriptionByStripeSubscriptionId(stripeSubscriptionId);

  if (existing) {
    return existing;
  }

  const stripeSubscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
  const userId = stripeSubscription.metadata?.userId;

  if (!userId) {
    return null;
  }

  const stripeCustomerId =
    typeof stripeSubscription.customer === "string"
      ? stripeSubscription.customer
      : stripeSubscription.customer?.id;

  const planId = resolvePlanIdFromStripeSubscription(stripeSubscription);

  await updateSubscriptionPlan(userId, {
    planId,
    status: mapStripeStatus(stripeSubscription.status),
    stripeCustomerId: stripeCustomerId ?? null,
    stripeSubscriptionId,
    currentPeriodEnd: toDate(
      getSubscriptionPeriodEnd(stripeSubscription as unknown as Record<string, unknown>),
    ),
  });

  return getOrCreateSubscription(userId);
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const stripe = getStripe();
  const stripeSubscriptionId = getInvoiceSubscriptionId(invoice as unknown as Record<string, unknown>);

  if (!stripeSubscriptionId || !invoice.id) {
    return;
  }

  const subscription = await resolveSubscriptionForInvoicePaid(stripe, stripeSubscriptionId);

  if (!subscription) {
    return;
  }

  const planId = resolveSubscriptionPlanIdFromInvoice(invoice, subscription.planId);
  const creditUnits = creditsToUnits(PLANS[planId].monthlyCredits);
  const periodStart = invoice.period_start ?? Math.floor(Date.now() / 1000);

  await grantCredits(
    subscription.userId,
    creditUnits,
    `subscription_grant:${planId}:${periodStart}`,
    invoice.id,
  );
}

async function handleSubscriptionUpdated(stripeSubscription: Stripe.Subscription) {
  const stripeSubscriptionId = stripeSubscription.id;
  const subscription = await findSubscriptionByStripeSubscriptionId(stripeSubscriptionId);

  if (!subscription) {
    const userId = stripeSubscription.metadata.userId;

    if (!userId) {
      return;
    }

    const planId = resolvePlanIdFromStripeSubscription(stripeSubscription);
    const stripeCustomerId =
      typeof stripeSubscription.customer === "string"
        ? stripeSubscription.customer
        : stripeSubscription.customer?.id;

    await updateSubscriptionPlan(userId, {
      planId,
      status: mapStripeStatus(stripeSubscription.status),
      stripeCustomerId: stripeCustomerId ?? null,
      stripeSubscriptionId,
      currentPeriodEnd: toDate(
        getSubscriptionPeriodEnd(stripeSubscription as unknown as Record<string, unknown>),
      ),
    });

    return;
  }

  const planId = resolvePlanIdFromStripeSubscription(stripeSubscription);

  await updateSubscriptionPlan(subscription.userId, {
    planId,
    status: mapStripeStatus(stripeSubscription.status),
    currentPeriodEnd: toDate(
      getSubscriptionPeriodEnd(stripeSubscription as unknown as Record<string, unknown>),
    ),
  });
}

async function handleSubscriptionDeleted(stripeSubscription: Stripe.Subscription) {
  const subscription = await findSubscriptionByStripeSubscriptionId(stripeSubscription.id);

  if (!subscription) {
    return;
  }

  await updateSubscriptionPlan(subscription.userId, {
    planId: "free",
    status: "canceled",
    stripeSubscriptionId: null,
    currentPeriodEnd: null,
  });
}

function resolvePlanIdFromStripeSubscription(stripeSubscription: Stripe.Subscription): PlanId {
  const metadataPlanId = resolvePlanIdFromMetadata(stripeSubscription.metadata.planId);
  const priceId = stripeSubscription.items.data[0]?.price.id;

  if (priceId) {
    const mapped = resolvePlanIdFromPriceId(priceId);

    if (mapped) {
      return mapped;
    }
  }

  return metadataPlanId;
}

function resolveSubscriptionPlanIdFromInvoice(
  invoice: Stripe.Invoice,
  fallbackPlanId: string,
): PlanId {
  const metadataPlanId = getInvoiceLinePlanId(invoice as unknown as Record<string, unknown>);

  if (metadataPlanId && metadataPlanId in PLANS) {
    return metadataPlanId as PlanId;
  }

  const priceId = getInvoiceLinePriceId(invoice as unknown as Record<string, unknown>);

  if (priceId) {
    const mapped = resolvePlanIdFromPriceId(priceId);

    if (mapped) {
      return mapped;
    }
  }

  if (fallbackPlanId in PLANS) {
    return fallbackPlanId as PlanId;
  }

  return "starter";
}

function resolvePlanIdFromMetadata(value: string | undefined): PlanId {
  if (value && value in PLANS) {
    return value as PlanId;
  }

  return "starter";
}

function toDate(unixSeconds: number | null | undefined): Date | null {
  if (!unixSeconds) {
    return null;
  }

  return new Date(unixSeconds * 1000);
}
