import Link from "next/link";
import styles from "./placeholder-page.module.css";

interface PlaceholderPageProps {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}

export function PlaceholderPage({
  title,
  description,
  actionHref,
  actionLabel,
}: PlaceholderPageProps) {
  return (
    <section className={styles.section}>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.description}>{description}</p>
      {actionHref && actionLabel ? (
        <Link href={actionHref} className={styles.action}>
          {actionLabel}
        </Link>
      ) : null}
    </section>
  );
}
