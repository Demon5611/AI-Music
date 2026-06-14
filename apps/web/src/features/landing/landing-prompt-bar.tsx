"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { lp } from "./landing-classes";
import { LANDING_RANDOM_PROMPTS } from "./landing-data";
import { IconDice, IconMusic } from "./landing-icons";
import {
  MUSIC_CREATE_PROMPT_MAX_LENGTH,
  saveMusicCreatePromptDraft,
} from "@/shared/lib/music-create-prompt-transfer";

function LandingCharCounter({ current, max }: { current: number; max: number }) {
  const isNearLimit = current / max > 0.9;

  return (
    <span className={isNearLimit ? lp.charCounterLimit : lp.charCounter}>
      {current}/{max}
    </span>
  );
}

function pickRandomPrompt(current: string) {
  const options = LANDING_RANDOM_PROMPTS.filter((item) => item !== current);
  const pool = options.length > 0 ? options : LANDING_RANDOM_PROMPTS;
  return pool[Math.floor(Math.random() * pool.length)] ?? LANDING_RANDOM_PROMPTS[0];
}

export function LandingPromptBar() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");

  function handleRandomPrompt() {
    setPrompt((current) => pickRandomPrompt(current));
  }

  function handleCreate() {
    saveMusicCreatePromptDraft(prompt);
    router.push("/music-create");
  }

  return (
    <div className={lp.promptWrap}>
      <div className={lp.promptCard}>
        <div className={lp.promptTextareaWrap}>
          <textarea
            rows={2}
            maxLength={MUSIC_CREATE_PROMPT_MAX_LENGTH}
            value={prompt}
            placeholder="Опиши трек который хочешь создать..."
            className={lp.promptTextarea}
            onChange={(event) => setPrompt(event.target.value)}
          />
          <div className={lp.promptCounterPos}>
            <LandingCharCounter
              current={prompt.length}
              max={MUSIC_CREATE_PROMPT_MAX_LENGTH}
            />
          </div>
        </div>
        <div className={lp.promptActions}>
          <button
            type="button"
            className={lp.iconButton}
            title="Случайный промпт"
            onClick={handleRandomPrompt}
          >
            <IconDice />
          </button>

          <button type="button" className={lp.createButton} onClick={handleCreate}>
            <IconMusic />
            Создать
          </button>
        </div>
      </div>
    </div>
  );
}
