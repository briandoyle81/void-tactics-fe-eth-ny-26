import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Next.js normally puts secrets in .env.local, but dotenv doesn't load it
// by default — load both, .env.local first so it wins if both are present
// (dotenv doesn't overwrite an already-set key), falling back to .env.
config({ path: [".env.local", ".env"] });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Use the unpooled/direct connection for migrations (bypasses PgBouncer).
    // Neon provides DATABASE_URL_UNPOOLED; fall back to DATABASE_URL if absent.
    url: process.env["DATABASE_URL_UNPOOLED"] ?? process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"],
  },
});
