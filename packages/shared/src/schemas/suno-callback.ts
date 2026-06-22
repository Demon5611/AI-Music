import { z } from "zod";

const sunoCallbackTrackSchema = z
  .object({
    id: z.string(),
    audio_url: z.string().optional(),
    audioUrl: z.string().optional(),
    stream_audio_url: z.string().optional(),
    streamAudioUrl: z.string().optional(),
    image_url: z.string().optional(),
    imageUrl: z.string().optional(),
    prompt: z.string().optional(),
    title: z.string().optional(),
    tags: z.string().optional(),
    duration: z.number().optional(),
  })
  .passthrough();

export const sunoMusicCallbackSchema = z.object({
  code: z.number(),
  msg: z.string().optional(),
  data: z
    .object({
      callbackType: z.enum(["text", "first", "complete"]).optional(),
      task_id: z.string().optional(),
      taskId: z.string().optional(),
      data: z.array(sunoCallbackTrackSchema).optional(),
    })
    .passthrough()
    .optional(),
});

export type SunoMusicCallbackPayload = z.infer<typeof sunoMusicCallbackSchema>;
