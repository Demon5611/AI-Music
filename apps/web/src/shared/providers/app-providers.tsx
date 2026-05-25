"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { env } from "@/shared/config/env";
import { ClerkApiProvider, DevApiProvider } from "./api-provider";

function InnerProviders({ children }: { children: ReactNode }) {
  if (env.isClerkEnabled) {
    return <ClerkApiProvider>{children}</ClerkApiProvider>;
  }

  return <DevApiProvider>{children}</DevApiProvider>;
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
          },
        },
      }),
  );

  const content = (
    <QueryClientProvider client={queryClient}>
      <InnerProviders>{children}</InnerProviders>
    </QueryClientProvider>
  );

  if (!env.isClerkEnabled) {
    return content;
  }

  return (
    <ClerkProvider publishableKey={env.clerkPublishableKey}>{content}</ClerkProvider>
  );
}
