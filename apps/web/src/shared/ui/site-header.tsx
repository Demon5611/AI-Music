import Link from "next/link";
import styles from "./site-header.module.css";

const NAV_ITEMS = [
  { href: "/create", label: "Create" },
  { href: "/voice", label: "Voice" },
  { href: "/profile", label: "Profile" },
  { href: "/pricing", label: "Pricing" },
] as const;

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
    </header>
  );
}
