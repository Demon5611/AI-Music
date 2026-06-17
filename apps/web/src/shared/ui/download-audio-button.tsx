"use client";

import { useAuth } from "@clerk/nextjs";
import { useState } from "react";
import { createDevAuthToken, env } from "@/shared/config/env";
import { appShell } from "@/shared/theme/app-theme";

interface DownloadAudioButtonProps {
  audioUrl: string;
  filename: string;
  label?: string;
  className?: string;
}

async function downloadAuthenticatedAudio(
  audioUrl: string,
  filename: string,
  getToken: () => Promise<string | null>,
): Promise<void> {
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
}

function DownloadAudioButtonContent({
  audioUrl,
  filename,
  label,
  className,
  getToken,
}: DownloadAudioButtonProps & {
  getToken: () => Promise<string | null>;
}) {
  const [isDownloading, setIsDownloading] = useState(false);
  const buttonClassName = className ?? appShell.btnSecondaryOutline;

  async function handleDownload() {
    setIsDownloading(true);

    try {
      await downloadAuthenticatedAudio(audioUrl, filename, getToken);
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <button
      className={buttonClassName}
      disabled={isDownloading}
      type="button"
      onClick={() => void handleDownload()}
    >
      {isDownloading ? "Скачивание..." : label}
    </button>
  );
}

function ClerkDownloadButton(props: DownloadAudioButtonProps) {
  const { getToken } = useAuth();

  return <DownloadAudioButtonContent {...props} getToken={getToken} />;
}

function DevDownloadButton(props: DownloadAudioButtonProps) {
  return (
    <DownloadAudioButtonContent
      {...props}
      getToken={async () => createDevAuthToken()}
    />
  );
}

export function DownloadAudioButton(props: DownloadAudioButtonProps) {
  const label = props.label ?? "Скачать";

  if (env.isClerkEnabled) {
    return <ClerkDownloadButton {...props} label={label} />;
  }

  return <DevDownloadButton {...props} label={label} />;
}
