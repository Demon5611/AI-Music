const clerkPublishableKey = (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "").trim();
const forceClerkInDev = process.env.NEXT_PUBLIC_FORCE_CLERK === "true";

function hasValidClerkPublishableKey(key: string): boolean {
  return /^pk_(test|live)_/.test(key);
}

export const env = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001",
  clerkPublishableKey,
  devAuthUserId: process.env.NEXT_PUBLIC_DEV_AUTH_USER_ID ?? "local-user-1",
  isClerkEnabled:
    hasValidClerkPublishableKey(clerkPublishableKey) &&
    (process.env.NODE_ENV === "production" || forceClerkInDev),
};

export function createDevAuthToken(): string {
  return `dev:${env.devAuthUserId}`;
}
