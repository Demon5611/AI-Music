import Link from "next/link";
import { FREE_DEMO_CREDITS } from "@ai-music/shared";
import { VoiceCreationPanel } from "@/features/voice/voice-creation-panel";
import { lp } from "./landing-classes";

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
          Запиши свой голос или загрузи образец — и создай трек с твоим вокалом за несколько минут.
        </p>

        <div className={lp.voiceWrap}>
          <div className={lp.voiceCard}>
            <VoiceCreationPanel variant="landing" />
          </div>
        </div>

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
    </div>
  );
}
