"use client";

import { SignInButton, SignUpButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { env } from "@/shared/config/env";
import styles from "./site-header.module.css";

const NAV_ITEMS = [
  { href: "/music-test", label: "Music Test" },
  { href: "/profile", label: "Profile" },
  { href: "/pricing", label: "Pricing" },
] as const;

function DevAuthBadge() {
  return (
    <span className={styles.devBadge} title="Dev auth token отправляется на API">
      Dev: {env.devAuthUserId}
    </span>
  );
}

function ClerkAuthActions() {
  return (
    <div className={styles.authActions}>
      <SignedOut>
        <SignInButton mode="modal">
          <button type="button" className={styles.authButton}>
            Войти
          </button>
        </SignInButton>
        <SignUpButton mode="modal">
          <button type="button" className={styles.authButtonPrimary}>
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
    <header className={styles.header}>
      <Link href="/" className={styles.logo}>
        AI Music
      </Link>
      <nav className={styles.nav}>
        {NAV_ITEMS.map((item) => (
          <Link key={item.href} href={item.href} className={styles.navLink}>
            {item.label}
          </Link>
        ))}
      </nav>
      <div className={styles.authActions}>
        {env.isClerkEnabled ? <ClerkAuthActions /> : <DevAuthBadge />}
      </div>
    </header>
  );
}
