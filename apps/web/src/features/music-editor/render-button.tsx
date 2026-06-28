"use client";

import type { SongVersionDto } from "@ai-music/shared";
import { OPERATION_COST_UNITS, formatCreditsFromUnits } from "@ai-music/shared";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useInvalidateCreditsBalance } from "@/features/billing/hooks/invalidate-credits-balance";
import { AudioPreviewPlayer } from "@/shared/ui/elevenlabs";
import { Tooltip } from "@/shared/ui/tooltip";
import { PlanGatedWrap } from "@/shared/ui/plan-gated";
import { DownloadAudioButton } from "@/features/music-editor/download-audio-button";
import { useApi } from "@/shared/providers/api-provider";
import { parseApiError } from "@/shared/lib/parse-api-error";
import { me } from "@/features/music-editor/music-editor-classes";

interface RenderButtonProps {
  disabled: boolean;
  isRendering: boolean;
  renderError: string | null;
  songId: string;
  songTitle: string;
  sourceTrackId: string | null;
  sourceLyricsText: string | null;
  versions: SongVersionDto[];
  onRender: () => void;
}

export function RenderButton({
  disabled,
  isRendering,
  renderError,
  songId,
  songTitle,
  sourceTrackId,
  sourceLyricsText,
  versions,
  onRender,
}: RenderButtonProps) {
  const api = useApi();
  const invalidateCreditsBalance = useInvalidateCreditsBalance();
  const [isExportingWav, setIsExportingWav] = useState(false);
  const [wavExportError, setWavExportError] = useState<string | null>(null);
  const [wavAudioUrl, setWavAudioUrl] = useState<string | null>(null);
  const [wavVersionNumber, setWavVersionNumber] = useState<number | null>(null);

  const latestRendered = versions.find(
    (version) => version.status === "completed" && version.renderedAudioUrl,
  );
  const latestFailedRender = versions.find((version) => version.status === "failed");
  const hasCompletedRender = Boolean(latestRendered?.renderedAudioUrl);
  const wavCostLabel = formatCreditsFromUnits(OPERATION_COST_UNITS.wavExport);

  useEffect(() => {
    setWavAudioUrl(null);
    setWavVersionNumber(null);
    setWavExportError(null);
  }, [latestRendered?.id]);

  async function handleExportWav() {
    if (!latestRendered) {
      return;
    }

    setIsExportingWav(true);
    setWavExportError(null);

    try {
      const result = await api.musicEditor.exportWav(songId, {
        versionId: latestRendered.id,
      });

      setWavAudioUrl(result.wavAudioUrl);
      setWavVersionNumber(result.versionNumber);

      if (!result.cached) {
        await invalidateCreditsBalance();
      }
    } catch (error) {
      setWavExportError(parseApiError(error, "Не удалось экспортировать WAV"));
    } finally {
      setIsExportingWav(false);
    }
  }

  return (
    <div className={me.panel}>
      <h3 className={me.panelTitle}>Render version</h3>
      <p className={me.panelHint}>
        Создайте новую аудиоверсию со всеми изменениями. Оригинал не будет перезаписан.
      </p>

      <Tooltip content="Создать новую версию, не изменяя оригинал">
        <button
          className={me.primaryButton}
          disabled={disabled || isRendering}
          type="button"
          onClick={onRender}
        >
          {isRendering ? "Rendering..." : "Render version"}
        </button>
      </Tooltip>

      {isRendering ? (
        <p className={me.renderStatus}>Сборка MP3 на сервере, подождите...</p>
      ) : null}

      {renderError ? <p className={me.error}>{renderError}</p> : null}

      {!isRendering && !hasCompletedRender && !renderError ? (
        <p className={me.renderStatus}>
          Готовых версий пока нет. После успешного render здесь появятся плеер и Download MP3.
        </p>
      ) : null}

      {!isRendering && latestFailedRender && !hasCompletedRender && !renderError ? (
        <p className={me.renderStatus}>
          Последний render (v{latestFailedRender.versionNumber}) не удался. Попробуйте ещё раз
          или обратитесь в поддержку, если ошибка повторяется.
        </p>
      ) : null}

      {latestRendered?.renderedAudioUrl ? (
        <div className={me.renderResult}>
          <p className={me.renderStatus}>Version {latestRendered.versionNumber} ready</p>
          <AudioPreviewPlayer
            className={me.player}
            karaoke={{
              trackId: sourceTrackId ?? undefined,
              defaultExpanded: false,
              lyricsText: sourceLyricsText,
            }}
            src={latestRendered.renderedAudioUrl}
          />
          <Tooltip content="Скачать MP3 — основной формат экспорта после render">
            <DownloadAudioButton
              audioUrl={latestRendered.renderedAudioUrl}
              className={me.toolButton}
              filename={`${songTitle}-v${latestRendered.versionNumber}.mp3`}
              label="Download MP3"
            />
          </Tooltip>

          <div className={me.toolbarRow}>
            <PlanGatedWrap feature="wavExport">
              <Tooltip content="Сохранить ту же render-версию в формате WAV для DAW и монтажа">
                <button
                  className={me.toolButton}
                  disabled={disabled || isExportingWav}
                  type="button"
                  onClick={() => void handleExportWav()}
                >
                  {isExportingWav
                    ? "Экспорт WAV..."
                    : `Экспорт в WAV (${wavCostLabel} credits)`}
                </button>
              </Tooltip>
            </PlanGatedWrap>
          </div>

          <p className={me.panelHint}>
            MP3 — бесплатный экспорт после render. WAV на Studio — тот же микс в другом формате
            (удобно для импорта в редакторы). Повторный экспорт той же версии бесплатен.
          </p>

          {wavExportError ? <p className={me.error}>{wavExportError}</p> : null}

          {wavAudioUrl && wavVersionNumber !== null ? (
            <Tooltip content="Скачать WAV-файл той же версии">
              <DownloadAudioButton
                audioUrl={wavAudioUrl}
                className={me.toolButton}
                filename={`${songTitle}-v${wavVersionNumber}.wav`}
                label="Скачать WAV"
              />
            </Tooltip>
          ) : null}
        </div>
      ) : (
        <p className={me.panelHint}>
          Экспорт в WAV (дополнительный формат) — на тарифе Studio после render.{" "}
          <Link className="text-violet-300 underline underline-offset-2" href="/pricing">
            Тарифы
          </Link>
        </p>
      )}
    </div>
  );
}
