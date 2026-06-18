"use client";

import { parseApiError } from "@/shared/lib/parse-api-error";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MusicHistoryPanel } from "@/features/music-history/music-history-panel";
import { mp } from "@/shared/theme/music-page-classes";
import { useAuthReady } from "@/shared/hooks/use-auth-ready";
import { useApi } from "@/shared/providers/api-provider";

function IconClock() {
  return (
    <svg
      aria-hidden="true"
      className={mp.icon}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      viewBox="0 0 24 24"
    >
      <path
        d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function MusicHistoryPage() {
  const api = useApi();
  const authReady = useAuthReady();
  const queryClient = useQueryClient();
  const router = useRouter();

  const [error, setError] = useState<string | null>(null);
  const [isDeletingHistory, setIsDeletingHistory] = useState(false);
  const [isDeletingTrack, setIsDeletingTrack] = useState(false);
  const [openingEditorTrackId, setOpeningEditorTrackId] = useState<string | null>(null);

  const historyQuery = useQuery({
    queryKey: ["music-history"],
    queryFn: () => api.music.history(),
    enabled: authReady,
  });

  async function refreshHistory() {
    await queryClient.invalidateQueries({ queryKey: ["music-history"] });
  }

  async function handleDeleteHistory(ids: string[]) {
    setIsDeletingHistory(true);
    setError(null);

    try {
      await api.music.deleteHistory(ids);
      await refreshHistory();
    } catch (deleteError) {
      setError(parseApiError(deleteError, "Не удалось загрузить историю", { includeUnauthorized: true }));
    } finally {
      setIsDeletingHistory(false);
    }
  }

  async function handleDeleteTrack(trackId: string) {
    setIsDeletingTrack(true);
    setError(null);

    try {
      await api.music.deleteTrack(trackId);
      await refreshHistory();
    } catch (deleteError) {
      setError(parseApiError(deleteError, "Не удалось загрузить историю", { includeUnauthorized: true }));
    } finally {
      setIsDeletingTrack(false);
    }
  }

  async function handleOpenEditor(trackId: string) {
    setOpeningEditorTrackId(trackId);
    setError(null);

    try {
      const result = await api.musicEditor.initEditor(trackId);
      router.push(`/music-editor/${result.songId}`);
    } catch (editorError) {
      setError(parseApiError(editorError, "Не удалось загрузить историю", { includeUnauthorized: true }));
    } finally {
      setOpeningEditorTrackId(null);
    }
  }

  if (!authReady) {
    return (
      <div className={mp.authLoading}>
        <div className={mp.authLoadingInner}>
          <span aria-hidden="true" className={mp.spinner} />
          Загрузка сессии...
        </div>
      </div>
    );
  }

  return (
    <div className={mp.page}>
      <header className={mp.pageHeader}>
        <div className={mp.pageHeaderBrand}>
          <div className={mp.pageHeaderLogo}>
            <IconClock />
          </div>
          <span className={mp.pageHeaderTitle}>История генераций</span>
        </div>
        <Link className={mp.pageHeaderMeta} href="/music-create">
          Music Create
        </Link>
      </header>

      <main className={mp.pageMain}>
        {historyQuery.error ? (
          <div className={mp.alertError} role="alert">
            {parseApiError(historyQuery.error, "Не удалось загрузить историю", {
              includeUnauthorized: true,
            })}
          </div>
        ) : null}

        {error ? (
          <div className={mp.alertError} role="alert">
            {error}
          </div>
        ) : null}

        <section className={mp.sectionCard}>
          <MusicHistoryPanel
            isDeleting={isDeletingHistory || isDeletingTrack}
            isLoading={historyQuery.isLoading}
            items={historyQuery.data ?? []}
            openingEditorTrackId={openingEditorTrackId}
            onDelete={handleDeleteHistory}
            onDeleteTrack={handleDeleteTrack}
            onOpenEditor={(id) => void handleOpenEditor(id)}
          />
        </section>
      </main>
    </div>
  );
}
