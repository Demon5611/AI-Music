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

export function getInvoiceSubscriptionId(invoice: StripeRecord): string | null {
  return readId(invoice.subscription);
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
  return readId(firstLine.price);
}
