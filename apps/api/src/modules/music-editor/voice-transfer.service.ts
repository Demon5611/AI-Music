import { createKitsVoiceTransferProvider } from "@ai-music/ai-providers";
import { prisma } from "@ai-music/db";
import { BadRequestError, NotFoundError } from "../../common/errors.js";
import { buildSongStemKey, getStorageService } from "../storage/storage.service.js";
import { applyOperation } from "./operation.service.js";
import { getSongForUser } from "./song-editor.service.js";

export async function transferVoiceForRegion(
  userId: string,
  songId: string,
  regionId: string,
  voiceModelId: number,
) {
  const song = await getSongForUser(userId, songId);
  const region = song.regions.find((item) => item.id === regionId);

  if (!region) {
    throw new NotFoundError("Region not found");
  }

  const vocalStem = song.stems.find((stem) => stem.type === "vocal");

  if (!vocalStem) {
    throw new BadRequestError("Vocal stem is not available");
  }

  const storage = getStorageService();
  const vocalBuffer = await storage.get(vocalStem.audioStorageKey);
  const provider = createKitsVoiceTransferProvider();
  const result = await provider.transferVoice({
    vocalAudioBuffer: vocalBuffer,
    voiceModelId,
    filename: "vocal.mp3",
  });

  const key = buildSongStemKey(userId, songId, "vocal");
  await storage.put(key, result.audioBuffer, "audio/mpeg");

  await prisma.songStem.update({
    where: { id: vocalStem.id },
    data: { audioStorageKey: key },
  });

  await applyOperation(
    userId,
    songId,
    {
      type: "REPLACE_VOCAL",
      regionId,
      voiceModelId,
    },
    { selectedRegionId: regionId },
  );

  return getSongForUser(userId, songId);
}
