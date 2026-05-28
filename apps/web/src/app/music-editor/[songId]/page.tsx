import { AudioEditor } from "@/features/music-editor/audio-editor";

interface MusicEditorPageProps {
  params: Promise<{ songId: string }>;
}

export default async function MusicEditorPage({ params }: MusicEditorPageProps) {
  const { songId } = await params;

  return <AudioEditor songId={songId} />;
}
