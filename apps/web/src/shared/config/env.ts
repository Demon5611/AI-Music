export const env = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001",
  clerkPublishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "",
  devAuthUserId: process.env.NEXT_PUBLIC_DEV_AUTH_USER_ID ?? "local-user-1",
  isClerkEnabled: Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY),
};

export function createDevAuthToken(): string {
  return `dev:${env.devAuthUserId}`;
}
