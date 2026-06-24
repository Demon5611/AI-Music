export interface AlbumCoverResponseDto {
  defaultImageUrl: string | null;
  images: string[];
  selectedImageUrl: string | null;
  cached: boolean;
}
