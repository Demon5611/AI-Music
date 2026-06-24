"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { mtk } from "@/shared/theme/music-track-classes";
import { TrackCoverImage } from "@/shared/ui/track-cover/track-cover-image";
import { TrackCoverLightbox } from "@/shared/ui/track-cover/track-cover-lightbox";
import { useApi } from "@/shared/providers/api-provider";
import { useSubscriptionQuery } from "@/features/billing/hooks/use-subscription-query";
import { useInvalidateCreditsBalance } from "@/features/billing/hooks/invalidate-credits-balance";
import { parseApiError } from "@/shared/lib/parse-api-error";
import { cn } from "@/lib/utils";

interface GenerationAlbumCoverSectionProps {
  generationId?: string;
  title: string;
  defaultImageUrl?: string | null;
  albumCoverImages?: string[];
  selectedAlbumCoverUrl?: string | null;
  onCoverUpdated?: (imageUrl: string | null, images: string[]) => void;
}

function buildVariantOptions(
  defaultImageUrl: string | null | undefined,
  albumCoverImages: string[],
): string[] {
  const values = [defaultImageUrl, ...albumCoverImages].filter(
    (value): value is string => Boolean(value?.trim()),
  );

  return [...new Set(values)];
}

export function GenerationAlbumCoverSection({
  generationId,
  title,
  defaultImageUrl,
  albumCoverImages = [],
  selectedAlbumCoverUrl,
  onCoverUpdated,
}: GenerationAlbumCoverSectionProps) {
  const api = useApi();
  const queryClient = useQueryClient();
  const subscriptionQuery = useSubscriptionQuery();
  const invalidateCreditsBalance = useInvalidateCreditsBalance();
  const canGenerateAlbumCover =
    subscriptionQuery.data?.entitlements.features.albumCover === true;

  const [images, setImages] = useState(albumCoverImages);
  const [activeImageUrl, setActiveImageUrl] = useState<string | null>(
    selectedAlbumCoverUrl ?? defaultImageUrl ?? null,
  );
  const [error, setError] = useState<string | null>(null);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!generationId) {
        throw new Error("Generation id is required");
      }

      try {
        return await api.music.getAlbumCover(generationId);
      } catch (fetchError) {
        const status =
          typeof fetchError === "object" &&
          fetchError !== null &&
          "status" in fetchError &&
          typeof (fetchError as { status: unknown }).status === "number"
            ? (fetchError as { status: number }).status
            : undefined;

        if (status === 404) {
          const created = await api.music.fetchAlbumCover(generationId);
          if (!created.cached) {
            await invalidateCreditsBalance();
          }
          return created;
        }

        throw fetchError;
      }
    },
    onSuccess: (result) => {
      setImages(result.images);
      const nextImage = result.selectedImageUrl ?? result.defaultImageUrl;
      setActiveImageUrl(nextImage);
      onCoverUpdated?.(nextImage, result.images);
      void queryClient.invalidateQueries({ queryKey: ["music-history"] });
      setError(null);
    },
    onError: (mutationError) => {
      setError(parseApiError(mutationError, "Не удалось сгенерировать обложку"));
    },
  });

  const selectMutation = useMutation({
    mutationFn: async (imageUrl: string) => {
      if (!generationId) {
        throw new Error("Generation id is required");
      }

      return api.music.selectAlbumCover(generationId, imageUrl);
    },
    onSuccess: (result) => {
      setActiveImageUrl(result.selectedImageUrl ?? result.defaultImageUrl);
      setImages(result.images);
      onCoverUpdated?.(result.selectedImageUrl ?? result.defaultImageUrl, result.images);
      void queryClient.invalidateQueries({ queryKey: ["music-history"] });
      setError(null);
    },
    onError: (mutationError) => {
      setError(parseApiError(mutationError, "Не удалось выбрать обложку"));
    },
  });

  const variants = buildVariantOptions(defaultImageUrl, images);
  const hasGeneratedVariants = images.length > 0;
  const isBusy = generateMutation.isPending || selectMutation.isPending;

  return (
    <div className={mtk.coverRow}>
      <TrackCoverImage
        imageUrl={activeImageUrl}
        title={title}
        onExpand={activeImageUrl ? () => setIsLightboxOpen(true) : undefined}
      />
      {isLightboxOpen && activeImageUrl ? (
        <TrackCoverLightbox
          imageUrl={activeImageUrl}
          title={title}
          onClose={() => setIsLightboxOpen(false)}
        />
      ) : null}
      <div className={mtk.coverPanel}>
        {variants.length > 1 ? (
          <div className={mtk.coverVariants}>
            {variants.map((imageUrl) => {
              const isActive = imageUrl === activeImageUrl;
              const className = cn(
                mtk.coverVariantButton,
                isActive ? mtk.coverVariantButtonActive : undefined,
              );

              if (isActive) {
                return (
                  <button
                    key={imageUrl}
                    aria-label="Выбранная обложка"
                    aria-pressed="true"
                    className={className}
                    disabled={isBusy || !generationId}
                    type="button"
                    onClick={() => selectMutation.mutate(imageUrl)}
                  >
                    <img alt="" className={mtk.coverVariantImage} src={imageUrl} />
                  </button>
                );
              }

              return (
                <button
                  key={imageUrl}
                  aria-label="Выбрать обложку"
                  aria-pressed="false"
                  className={className}
                  disabled={isBusy || !generationId}
                  type="button"
                  onClick={() => selectMutation.mutate(imageUrl)}
                >
                  <img alt="" className={mtk.coverVariantImage} src={imageUrl} />
                </button>
              );
            })}
          </div>
        ) : null}

        {canGenerateAlbumCover && generationId && !hasGeneratedVariants ? (
          <>
            <button
              className={mtk.coverActionButton}
              disabled={isBusy}
              type="button"
              onClick={() => generateMutation.mutate()}
            >
              {generateMutation.isPending ? "Генерируем обложку..." : "Новые варианты обложки"}
            </button>
            <p className={mtk.coverHint}>
              AI Music создаёт 2 варианта по стилю трека.
            </p>
          </>
        ) : null}

        {!canGenerateAlbumCover ? (
          <p className={mtk.coverHint}>
            Новые варианты обложки — на тарифе Pro.{" "}
            <Link className="text-violet-300 underline underline-offset-2" href="/pricing">
              Тарифы
            </Link>
          </p>
        ) : null}

        {error ? <p className={mtk.error}>{error}</p> : null}
      </div>
    </div>
  );
}
