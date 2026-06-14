import Link from "next/link";
import { FREE_DEMO_CREDITS } from "@ai-music/shared";
import { lp } from "./landing-classes";

import { IconArrow, IconPlay } from "./landing-icons";
import { LandingPromptBar } from "./landing-prompt-bar";

export function LandingPage() {
  return (
    <div className={lp.page}>
      <section className={lp.heroSection}>
        <div aria-hidden className={lp.heroGlow} />

        <p className={lp.eyebrow}>AI Music Create</p>

        <h1 className={lp.title}>
          Создай любую
          <br />
          <span className={lp.titleGradient}>песню</span> которую
          <br />
          можешь представить
        </h1>

        <p className={lp.subtitle}>
          Задай prompt для трека, стиль, образец голоса — и через несколько минут готовый трек с твоим
          голосом.
        </p>

        <LandingPromptBar />

        <p className={lp.note}>
          {FREE_DEMO_CREDITS} demo credits для новых пользователей · без кредитной карты
        </p>
      </section>

      <section className={lp.ctaSection}>
        <p className={lp.ctaSubtitle}>
          Профессиональная музыка без водяных знаков — быстро и доступно.
        </p>
        <div className={lp.ctaActions}>
          <Link href="/pricing" className={lp.ctaSecondary}>
            Тарифы
          </Link>
        </div>
      </section>

      <footer className={lp.footer}>
        <span>© 2026 AI Music</span>
        <div className={lp.footerLinks}>
          <Link href="/music-create" className={lp.footerLink}>
            Создать
          </Link>
          <Link href="/history" className={lp.footerLink}>
            История
          </Link>
          <Link href="/pricing" className={lp.footerLink}>
            Тарифы
          </Link>
        </div>
      </footer>
    </div>
  );
}
