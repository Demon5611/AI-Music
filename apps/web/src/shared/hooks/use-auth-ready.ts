"use client";

import { useAuth } from "@clerk/nextjs";
import { env } from "@/shared/config/env";

export interface AuthSession {
  isLoaded: boolean;
  isSignedIn: boolean;
  authReady: boolean;
}

function useClerkAuthSession(): AuthSession {
  const { isLoaded, isSignedIn } = useAuth();

  return {
    isLoaded,
    isSignedIn: Boolean(isSignedIn),
    authReady: isLoaded && Boolean(isSignedIn),
  };
}

function useDevAuthSession(): AuthSession {
  return {
    isLoaded: true,
    isSignedIn: true,
    authReady: true,
  };
}

const useAuthSessionHook = env.isClerkEnabled ? useClerkAuthSession : useDevAuthSession;

export function useAuthSession(): AuthSession {
  return useAuthSessionHook();
}

export function useAuthReady(): boolean {
  return useAuthSession().authReady;
}
