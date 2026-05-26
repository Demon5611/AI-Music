function getAudioDurationSec(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    const objectUrl = URL.createObjectURL(file);

    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(Math.round(audio.duration));
    };
    audio.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Не удалось прочитать длительность аудио"));
    };
    audio.src = objectUrl;
  });
}

export async function readAudioDurationSec(file: File): Promise<number> {
  const durationSec = await getAudioDurationSec(file);

  if (!Number.isFinite(durationSec) || durationSec <= 0) {
    throw new Error("Некорректная длительность аудио");
  }

  return durationSec;
}
