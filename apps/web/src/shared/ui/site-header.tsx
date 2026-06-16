"use client";

import { SignInButton, SignUpButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { env } from "@/shared/config/env";
import { appShell } from "@/shared/theme/app-theme";
import { ThemeToggle } from "@/shared/ui/theme-toggle";

const NAV_ITEMS = [
  { href: "/music-create", label: "Music Create" },
  { href: "/history", label: "History" },
  { href: "/profile", label: "Profile" },
  { href: "/pricing", label: "Pricing" },
] as const;

function DevAuthBadge() {
  return (
    <span className={appShell.siteHeaderDevBadge} title="Dev auth token отправляется на API">
      Dev: {env.devAuthUserId}
    </span>
  );
}

function ClerkAuthActions() {
  return (
    <div className={appShell.siteHeaderAuthActions}>
      <SignedOut>
        <SignInButton mode="modal">
          <button type="button" className={appShell.siteHeaderAuthButton}>
            Войти
          </button>
        </SignInButton>
        <SignUpButton mode="modal">
          <button type="button" className={appShell.siteHeaderAuthButtonPrimary}>
            Регистрация
          </button>
        </SignUpButton>
      </SignedOut>
      <SignedIn>
        <UserButton afterSignOutUrl="/" />
      </SignedIn>
    </div>
  );
}

export function SiteHeader() {
  return (
    <header className={appShell.siteHeader}>
      <Link className={appShell.siteHeaderLogo} href="/">
        AI Music Editor
      </Link>
      <nav className={appShell.siteHeaderNav}>
        {NAV_ITEMS.map((item) => (
          <Link key={item.href} className={appShell.siteHeaderNavLink} href={item.href}>
            {item.label}
          </Link>
        ))}
      </nav>
      <div className={appShell.siteHeaderActions}>
        <ThemeToggle />
        {env.isClerkEnabled ? <ClerkAuthActions /> : <DevAuthBadge />}
      </div>
    </header>
  );
}
