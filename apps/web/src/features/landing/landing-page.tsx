import Link from "next/link";
import { FREE_DEMO_CREDITS } from "@ai-music/shared";
import styles from "./styles/landing.module.css";

export function LandingPage() {
  return (
    <section className={styles.hero}>
      <p className={styles.eyebrow}>AI Music MVP</p>
      <h1 className={styles.title}>Создай песню своим голосом</h1>
      <p className={styles.subtitle}>
        Prompt, стиль, запись голоса — и через несколько минут готовый трек с voice transfer.
      </p>
      <div className={styles.actions}>
        <Link href="/music-create" className={styles.primaryAction}>
          Создать трек
        </Link>
        <Link href="/pricing" className={styles.secondaryAction}>
          Тарифы
        </Link>
      </div>
      <p className={styles.note}>{FREE_DEMO_CREDITS} demo credits для новых пользователей</p>
    </section>
  );
}
