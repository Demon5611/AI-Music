import type { User } from "@ai-music/shared";
import type { ApiClient } from "./client.js";

export function createUsersApi(client: ApiClient) {
  return {
    getMe: () => client.get<User>("/api/users/me"),
  };
}
