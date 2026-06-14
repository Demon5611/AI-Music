"use client";

import { ApiError } from "@ai-music/api-client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MusicHistoryPanel } from "@/features/music-history/music-history-panel";
import { mt } from "@/features/music-create/music-create-classes";
import { useAuthReady } from "@/shared/hooks/use-auth-ready";
import { useApi } from "@/shared/providers/api-provider";

function resolveErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.body && typeof error.body === "object") {
    const body = error.body as { error?: string };
    if (body.error) {
      return body.error;
    }
  }

  if (error instanceof ApiError && error.status === 401) {
    return "Unauthorized";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Не удалось загрузить историю";
}

function IconClock() {
  return (
    <svg
      aria-hidden="true"
      className={mt.icon}
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
      setError(resolveErrorMessage(deleteError));
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
      setError(resolveErrorMessage(deleteError));
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
      setError(resolveErrorMessage(editorError));
    } finally {
      setOpeningEditorTrackId(null);
    }
  }

  if (!authReady) {
    return (
      <div className={mt.authLoading}>
        <div className={mt.authLoadingInner}>
          <span aria-hidden="true" className={mt.spinner} />
          Загрузка сессии...
        </div>
      </div>
    );
  }

  return (
    <div className={mt.page}>
      <header className={mt.pageHeader}>
        <div className={mt.pageHeaderBrand}>
          <div className={mt.pageHeaderLogo}>
            <IconClock />
          </div>
          <span className={mt.pageHeaderTitle}>История генераций</span>
        </div>
        <Link className={mt.pageHeaderMeta} href="/music-create">
          Music Create
        </Link>
      </header>

      <main className={mt.pageMain}>
        {historyQuery.error ? (
          <div className={mt.alertError} role="alert">
            {resolveErrorMessage(historyQuery.error)}
          </div>
        ) : null}

        {error ? (
          <div className={mt.alertError} role="alert">
            {error}
          </div>
        ) : null}

        <section className={mt.sectionCard}>
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
