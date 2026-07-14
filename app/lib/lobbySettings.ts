import { prisma } from "./prisma";
import { createTtlCache } from "./ttlCache";

// Web2-mode counterpart to the LobbyManager contract's `paused` admin
// kill-switch (read via `useLobbies.ts`'s `paused`) — a DB-backed toggle
// instead of an on-chain flag, gated on WEB2_ADMIN_EMAILS instead of
// contract ownership.
export type LobbySettings = { paused: boolean };

export const DEFAULT_LOBBY_SETTINGS: LobbySettings = { paused: false };

const cache = createTtlCache<LobbySettings>(async () => {
  const row = await prisma.config.findUnique({ where: { key: "lobby_settings" } });
  if (!row) return DEFAULT_LOBBY_SETTINGS;
  const stored = row.value as Partial<LobbySettings>;
  return { ...DEFAULT_LOBBY_SETTINGS, ...stored };
}, 30_000);

export const getLobbySettings = cache.get;
export const invalidateLobbySettingsCache = cache.invalidate;
