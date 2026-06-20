"use client";

import { SignInButton, SignUpButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
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

function ClerkAuthActions({ compact = false }: { compact?: boolean }) {
  const buttonClass = compact
    ? `${appShell.siteHeaderAuthButton} w-full justify-center`
    : appShell.siteHeaderAuthButton;
  const primaryClass = compact
    ? `${appShell.siteHeaderAuthButtonPrimary} w-full justify-center`
    : appShell.siteHeaderAuthButtonPrimary;

  return (
    <div className={compact ? "flex w-full flex-col gap-2" : appShell.siteHeaderAuthActions}>
      <SignedOut>
        <SignInButton mode="modal">
          <button type="button" className={buttonClass}>
            Войти
          </button>
        </SignInButton>
        <SignUpButton mode="modal">
          <button type="button" className={primaryClass}>
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

function SiteHeaderNav({
  onNavigate,
  className,
}: {
  onNavigate?: () => void;
  className: string;
}) {
  return (
    <nav className={className}>
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.href}
          className={appShell.siteHeaderNavLink}
          href={item.href}
          onClick={onNavigate}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

export function SiteHeader() {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  function closeMobileNav() {
    setIsMobileNavOpen(false);
  }

  function toggleMobileNav() {
    setIsMobileNavOpen((open) => !open);
  }

  return (
    <header className={appShell.siteHeader}>
      <div className={appShell.siteHeaderBar}>
        <Link className={appShell.siteHeaderLogo} href="/">
          AI Music Editor
        </Link>

        <SiteHeaderNav className={appShell.siteHeaderNav} />

        <div className={appShell.siteHeaderActions}>
          <ThemeToggle />
          <div className="hidden md:contents">
            {env.isClerkEnabled ? <ClerkAuthActions /> : <DevAuthBadge />}
          </div>
          {isMobileNavOpen ? (
            <button
              aria-controls="site-header-mobile-nav"
              aria-expanded="true"
              aria-label="Закрыть меню"
              className={appShell.siteHeaderMenuButton}
              type="button"
              onClick={toggleMobileNav}
            >
              <X aria-hidden className={appShell.siteHeaderMenuIcon} />
            </button>
          ) : (
            <button
              aria-controls="site-header-mobile-nav"
              aria-expanded="false"
              aria-label="Открыть меню"
              className={appShell.siteHeaderMenuButton}
              type="button"
              onClick={toggleMobileNav}
            >
              <Menu aria-hidden className={appShell.siteHeaderMenuIcon} />
            </button>
          )}
        </div>
      </div>

      {isMobileNavOpen ? (
        <div className={appShell.siteHeaderNavMobile} id="site-header-mobile-nav">
          <SiteHeaderNav className="flex flex-col gap-0.5" onNavigate={closeMobileNav} />
          <div className="mt-3 border-t border-[var(--app-border-subtle)] pt-3 md:hidden">
            {env.isClerkEnabled ? <ClerkAuthActions compact /> : <DevAuthBadge />}
          </div>
        </div>
      ) : null}
    </header>
  );
}
