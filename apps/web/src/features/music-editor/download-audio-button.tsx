"use client";

import { useAuth } from "@clerk/nextjs";
import { useState } from "react";
import { createDevAuthToken, env } from "@/shared/config/env";
import { me } from "@/features/music-editor/music-editor-classes";

interface DownloadAudioButtonProps {
  audioUrl: string;
  filename: string;
  label?: string;
}

function DevDownloadButton({
  audioUrl,
  filename,
  label,
}: DownloadAudioButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  async function handleDownload() {
    setIsDownloading(true);

    try {
      const response = await fetch(audioUrl, {
        headers: { Authorization: `Bearer ${createDevAuthToken()}` },
      });

      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`);
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(objectUrl);
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <button
      className={me.toolButton}
      disabled={isDownloading}
      type="button"
      onClick={() => void handleDownload()}
    >
      {isDownloading ? "Скачивание..." : label}
    </button>
  );
}

function ClerkDownloadButton({
  audioUrl,
  filename,
  label,
}: DownloadAudioButtonProps) {
  const { getToken } = useAuth();
  const [isDownloading, setIsDownloading] = useState(false);

  async function handleDownload() {
    setIsDownloading(true);

    try {
      const token = await getToken();
      const response = await fetch(audioUrl, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`);
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(objectUrl);
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <button
      className={me.toolButton}
      disabled={isDownloading}
      type="button"
      onClick={() => void handleDownload()}
    >
      {isDownloading ? "Скачивание..." : label}
    </button>
  );
}

export function DownloadAudioButton(props: DownloadAudioButtonProps) {
  const label = props.label ?? "Скачать";

  if (env.isClerkEnabled) {
    return <ClerkDownloadButton {...props} label={label} />;
  }

  return <DevDownloadButton {...props} label={label} />;
}
