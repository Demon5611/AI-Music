"use client";

import { useAuth } from "@clerk/nextjs";
import { env } from "@/shared/config/env";

export function useAuthReady(): boolean {
  const { isLoaded, isSignedIn } = useAuth();

  if (!env.isClerkEnabled) {
    return true;
  }

  return isLoaded && isSignedIn;
}
