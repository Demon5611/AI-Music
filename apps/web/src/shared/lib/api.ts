import { createApi } from "@ai-music/api-client";
import { env } from "@/shared/config/env";

export const api = createApi({ baseUrl: env.apiUrl });
