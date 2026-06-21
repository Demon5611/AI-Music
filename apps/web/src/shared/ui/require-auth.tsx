"use client";

import type { ReactNode } from "react";
import { useAuthSession } from "@/shared/hooks/use-auth-ready";
import { AuthGate, type AuthGateLayout } from "@/shared/ui/auth-gate";
import { authUi } from "@/shared/ui/auth-classes";

interface RequireAuthProps {
  title: string;
  hint?: string;
  layout?: AuthGateLayout;
  loadingFallback?: ReactNode;
  children: ReactNode;
}

function DefaultLoadingFallback() {
  return (
    <div className={authUi.pageShell}>
      <div className={authUi.loadingInner}>
        <span aria-hidden="true" className={authUi.spinner} />
        Загрузка сессии...
      </div>
    </div>
  );
}

export function RequireAuth({
  title,
  hint,
  layout = "page",
  loadingFallback,
  children,
}: RequireAuthProps) {
  const { isLoaded, isSignedIn } = useAuthSession();

  if (!isLoaded) {
    return loadingFallback ?? <DefaultLoadingFallback />;
  }

  if (!isSignedIn) {
    return <AuthGate hint={hint} layout={layout} title={title} />;
  }

  return children;
}
