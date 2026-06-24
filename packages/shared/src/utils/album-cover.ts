export function parseAlbumCoverImagesJson(value: unknown): string[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const images = value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);

  return images.length > 0 ? images : null;
}
