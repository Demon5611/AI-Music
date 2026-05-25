"use client";

import { createApi, type Api } from "@ai-music/api-client";
import { useAuth } from "@clerk/nextjs";
import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { createDevAuthToken, env } from "@/shared/config/env";

const ApiContext = createContext<Api | null>(null);

export function DevApiProvider({ children }: { children: ReactNode }) {
  const api = useMemo(
    () =>
      createApi({
        baseUrl: env.apiUrl,
        getAuthToken: () => createDevAuthToken(),
      }),
    [],
  );

  return <ApiContext.Provider value={api}>{children}</ApiContext.Provider>;
}

export function ClerkApiProvider({ children }: { children: ReactNode }) {
  const { getToken } = useAuth();

  const api = useMemo(
    () =>
      createApi({
        baseUrl: env.apiUrl,
        getAuthToken: () => getToken(),
      }),
    [getToken],
  );

  return <ApiContext.Provider value={api}>{children}</ApiContext.Provider>;
}

export function useApi(): Api {
  const api = useContext(ApiContext);

  if (!api) {
    throw new Error("useApi must be used within ApiProvider");
  }

  return api;
}
