"use client";

import type { KitsPaginationMeta, KitsVoiceModel } from "@ai-music/shared";
import { useDeferredValue, useEffect, useState } from "react";
import { useApi } from "@/shared/providers/api-provider";
import { AiProcessingStatus, LoadingPanel } from "@/shared/ui/elevenlabs";
import {
  filterKitsVoiceModels,
  isKitsVoiceModelSearchActive,
  KITS_VOICE_MODELS_MAX_SEARCH_PAGES,
  KITS_VOICE_MODELS_PAGE_SIZE,
} from "@/features/music-editor/utils/kits-voice-models";
import { me } from "@/features/music-editor/music-editor-classes";

interface VoiceTransferDialogProps {
  open: boolean;
  disabled: boolean;
  onClose: () => void;
  onConfirm: (voiceModelId: number) => Promise<void>;
}

async function fetchVoiceModelsPage(
  listVoiceModels: (params: { page: number; perPage: number }) => Promise<{
    data: KitsVoiceModel[];
    meta: KitsPaginationMeta;
  }>,
  page: number,
) {
  return listVoiceModels({
    page,
    perPage: KITS_VOICE_MODELS_PAGE_SIZE,
  });
}

export function VoiceTransferDialog({
  open,
  disabled,
  onClose,
  onConfirm,
}: VoiceTransferDialogProps) {
  const api = useApi();
  const [models, setModels] = useState<KitsVoiceModel[]>([]);
  const [paginationMeta, setPaginationMeta] = useState<KitsPaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const isSearchActive = isKitsVoiceModelSearchActive(deferredSearchQuery);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [manualId, setManualId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    setPage(1);
    setSearchQuery("");
    setSelectedId(null);
    setManualId("");
    setError(null);
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;

    void Promise.resolve().then(async () => {
      setIsLoading(true);
      setError(null);

      try {
        if (isSearchActive) {
          const firstPage = await fetchVoiceModelsPage(api.kits.listVoiceModels, 1);

          if (cancelled) {
            return;
          }

          const pagesToLoad = Math.min(firstPage.meta.lastPage, KITS_VOICE_MODELS_MAX_SEARCH_PAGES);
          const pageResponses = await Promise.all(
            Array.from({ length: pagesToLoad }, (_, index) => {
              const pageNumber = index + 1;

              if (pageNumber === 1) {
                return Promise.resolve(firstPage);
              }

              return fetchVoiceModelsPage(api.kits.listVoiceModels, pageNumber);
            }),
          );

          if (cancelled) {
            return;
          }

          const catalog = pageResponses.flatMap((response) => response.data ?? []);
          setModels(filterKitsVoiceModels(catalog, deferredSearchQuery));
          setPaginationMeta(null);
          return;
        }

        const response = await fetchVoiceModelsPage(api.kits.listVoiceModels, page);

        if (cancelled) {
          return;
        }

        setModels(response.data ?? []);
        setPaginationMeta(response.meta);
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Не удалось загрузить каталог голосов Kits",
          );
          setModels([]);
          setPaginationMeta(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    });

    return () => {
      cancelled = true;
    };
  }, [api, deferredSearchQuery, isSearchActive, open, page]);

  if (!open) {
    return null;
  }

  function handleSelectModel(modelId: number) {
    setSelectedId(modelId);
    setManualId("");
    setError(null);
  }

  async function handleConfirm() {
    const voiceModelId = selectedId ?? Number(manualId);

    if (!Number.isFinite(voiceModelId) || voiceModelId <= 0) {
      setError("Выберите голос из каталога или укажите voice model id");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onConfirm(voiceModelId);
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Voice transfer failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  const catalogHint = isSearchActive
    ? `Поиск по первым ${KITS_VOICE_MODELS_MAX_SEARCH_PAGES} страницам каталога (название, теги, id).`
    : "Каталог royalty-free голосов";

  return (
    <div className={me.dialogBackdrop}>
      <div className={me.dialogCardWide}>
        <h3 className={me.panelTitle}>Заменить вокал (Kits)</h3>
        <p className={me.dialogHint}>{catalogHint}</p>

        <label className={me.fieldLabel}>
          Поиск
          <input
            className={me.textInput}
            disabled={disabled || isSubmitting}
            placeholder="Pop Female, LoFi, 1014961..."
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setPage(1);
            }}
          />
        </label>

        {isLoading ? <LoadingPanel lines={2} /> : null}
        {isSubmitting ? (
          <AiProcessingStatus agentState="thinking" label="Конвертация вокала..." />
        ) : null}

        {!isLoading && models.length > 0 ? (
          <div className={me.voiceModelListSection}>
            <p className={me.voiceModelListTitle}>
              {isSearchActive
                ? `Найдено: ${models.length}`
                : `Голоса на странице: ${models.length}`}
            </p>
            <div className={me.voiceModelList}>
              {models.map((model) => (
                <button
                  key={model.id}
                  className={
                    selectedId === model.id
                      ? me.voiceModelOptionSelected
                      : me.voiceModelOption
                  }
                  disabled={disabled || isSubmitting}
                  type="button"
                  onClick={() => handleSelectModel(model.id)}
                >
                  <span className={me.voiceModelOptionTitle}>{model.title}</span>
                  <span className={me.voiceModelOptionMeta}>ID {model.id}</span>
                  {model.tags.length > 0 ? (
                    <span className={me.voiceModelOptionTags}>
                      {model.tags.slice(0, 4).join(", ")}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {!isLoading && models.length === 0 && !error ? (
          <p className={me.dialogHint}>
            {isSearchActive
              ? "Ничего не найдено. Измените запрос или укажите id вручную."
              : "Каталог пуст на этой странице."}
          </p>
        ) : null}

        {!isSearchActive && paginationMeta ? (
          <div className={me.voiceModelPagination}>
            <button
              className={me.toolButton}
              disabled={disabled || isSubmitting || paginationMeta.currentPage <= 1}
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Назад
            </button>
            <span className={me.voiceModelPaginationLabel}>
              Страница {paginationMeta.currentPage} из {paginationMeta.lastPage}
              {paginationMeta.total > 0 ? ` (${paginationMeta.total} голосов)` : null}
            </span>
            <button
              className={me.toolButton}
              disabled={
                disabled || isSubmitting || paginationMeta.currentPage >= paginationMeta.lastPage
              }
              type="button"
              onClick={() => setPage((current) => Math.min(paginationMeta.lastPage, current + 1))}
            >
              Далее
            </button>
          </div>
        ) : null}

        <label className={me.fieldLabel}>
          Или введите Kits voice model id
          <input
            className={me.textInput}
            disabled={disabled || isSubmitting}
            inputMode="numeric"
            placeholder="1014961"
            value={manualId}
            onChange={(event) => {
              setManualId(event.target.value);
              setSelectedId(null);
            }}
          />
        </label>

        {error ? <p className={me.error}>{error}</p> : null}
        <div className={me.dialogActions}>
          <button
            className={me.toolButton}
            disabled={isSubmitting}
            type="button"
            onClick={onClose}
          >
            Отмена
          </button>
          <button
            className={me.primaryButton}
            disabled={disabled || isSubmitting}
            type="button"
            onClick={() => void handleConfirm()}
          >
            {isSubmitting ? "Конвертация..." : "Заменить вокал"}
          </button>
        </div>
      </div>
    </div>
  );
}
