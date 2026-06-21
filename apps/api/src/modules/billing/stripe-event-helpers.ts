type StripeRecord = Record<string, unknown>;

function readString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" ? value : null;
}

function readId(value: unknown): string | null {
  const direct = readString(value);

  if (direct) {
    return direct;
  }

  if (value && typeof value === "object" && "id" in value) {
    return readString((value as StripeRecord).id);
  }

  return null;
}

function readNestedId(root: unknown, path: string[]): string | null {
  let current: unknown = root;

  for (const key of path) {
    if (!current || typeof current !== "object") {
      return null;
    }

    current = (current as StripeRecord)[key];
  }

  return readId(current);
}

export function getInvoiceSubscriptionId(invoice: StripeRecord): string | null {
  const direct = readId(invoice.subscription);

  if (direct) {
    return direct;
  }

  const fromParent = readNestedId(invoice.parent, ["subscription_details", "subscription"]);

  if (fromParent) {
    return fromParent;
  }

  const lines = invoice.lines;

  if (!lines || typeof lines !== "object" || !("data" in lines)) {
    return null;
  }

  const data = (lines as StripeRecord).data;

  if (!Array.isArray(data) || data.length === 0) {
    return null;
  }

  const firstLine = data[0] as StripeRecord;

  return readNestedId(firstLine.parent, ["subscription_item_details", "subscription"]);
}

export function getSubscriptionPeriodEnd(subscription: StripeRecord): number | null {
  return readNumber(subscription.current_period_end);
}

export function getInvoiceLinePriceId(invoice: StripeRecord): string | null {
  const lines = invoice.lines;

  if (!lines || typeof lines !== "object" || !("data" in lines)) {
    return null;
  }

  const data = (lines as StripeRecord).data;

  if (!Array.isArray(data) || data.length === 0) {
    return null;
  }

  const firstLine = data[0] as StripeRecord;
  const legacyPrice = readId(firstLine.price);

  if (legacyPrice) {
    return legacyPrice;
  }

  const fromPricing = readNestedId(firstLine.pricing, ["price_details", "price"]);

  if (fromPricing) {
    return fromPricing;
  }

  return null;
}

export function getInvoiceLinePlanId(invoice: StripeRecord): string | null {
  const lines = invoice.lines;

  if (!lines || typeof lines !== "object" || !("data" in lines)) {
    return null;
  }

  const data = (lines as StripeRecord).data;

  if (!Array.isArray(data) || data.length === 0) {
    return null;
  }

  const firstLine = data[0] as StripeRecord;
  const metadata = firstLine.metadata;

  if (!metadata || typeof metadata !== "object") {
    return null;
  }

  return readString((metadata as StripeRecord).planId);
}
