"use client";

import { useAuth } from "@clerk/nextjs";
import { env } from "@/shared/config/env";

function useClerkAuthReady(): boolean {
  const { isLoaded, isSignedIn } = useAuth();
  return isLoaded && isSignedIn;
}

function useDevAuthReady(): boolean {
  return true;
}

export const useAuthReady = env.isClerkEnabled ? useClerkAuthReady : useDevAuthReady;
