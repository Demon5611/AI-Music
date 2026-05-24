import { z } from "zod";

export const musicStyleSchema = z.enum([
  "pop",
  "rock",
  "hip-hop",
  "electronic",
  "r-and-b",
  "acoustic",
]);

export const createGenerationSchema = z.object({
  prompt: z.string().min(3).max(500),
  style: musicStyleSchema,
  voiceSampleId: z.string().uuid(),
  duration: z.number().int().min(30).max(180).default(60),
});

export const voiceConsentSchema = z.object({
  confirmed: z.literal(true),
  consentPhrase: z.literal(
    "Я подтверждаю, что использую свой голос для создания музыкального трека.",
  ),
});

export const createCheckoutSessionSchema = z.object({
  packageId: z.enum(["starter", "creator", "pro"]),
});

export type CreateGenerationInput = z.infer<typeof createGenerationSchema>;
export type VoiceConsentInput = z.infer<typeof voiceConsentSchema>;
export type CreateCheckoutSessionInput = z.infer<
  typeof createCheckoutSessionSchema
>;
