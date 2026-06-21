"use client";

import { me } from "@/features/music-editor/music-editor-classes";
import { PlanGatedWrap } from "@/shared/ui/plan-gated";

interface EditorStemNoticeProps {
  notice: string;
  disabled?: boolean;
  isRetrying?: boolean;
  onRetry: () => void;
}

export function EditorStemNotice({
  notice,
  disabled = false,
  isRetrying = false,
  onRetry,
}: EditorStemNoticeProps) {
  return (
    <div className={me.stemNoticeCard} role="status">
      <p className={me.stemNoticeTitle}>AI Music не разделил дорожки</p>
      <p className={me.stemNoticeMessage}>{notice}</p>
      <p className={me.stemNoticeHint}>
        Редактор открыт с полным миксом на обеих дорожках. Можно повторить разделение — AI Music
        иногда отклоняет трек при первой попытке.
      </p>
      <div className={me.stemNoticeActions}>
        <PlanGatedWrap feature="stemSeparation">
          <button
            className={me.primaryButton}
            disabled={disabled || isRetrying}
            type="button"
            onClick={onRetry}
          >
            {isRetrying ? "Повторяем разделение..." : "Повторить разделение"}
          </button>
        </PlanGatedWrap>
      </div>
    </div>
  );
}
