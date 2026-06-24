"use client";

import { mtk } from "@/shared/theme/music-track-classes";
import { cn } from "@/lib/utils";

interface TrackCoverImageProps {
  imageUrl?: string | null;
  title: string;
  className?: string;
  onExpand?: () => void;
}

export function TrackCoverImage({
  imageUrl,
  title,
  className,
  onExpand,
}: TrackCoverImageProps) {
  if (!imageUrl?.trim()) {
    return <div className={cn(mtk.coverPlaceholder, className)}>Нет обложки</div>;
  }

  if (onExpand) {
    return (
      <button
        aria-label={`Открыть обложку: ${title}`}
        className={cn(mtk.coverImageButton, className)}
        type="button"
        onClick={onExpand}
      >
        <img
          alt={`Обложка: ${title}`}
          className={mtk.coverImageInner}
          src={imageUrl}
        />
      </button>
    );
  }

  return (
    <img
      alt={`Обложка: ${title}`}
      className={cn(mtk.coverImage, className)}
      src={imageUrl}
    />
  );
}
