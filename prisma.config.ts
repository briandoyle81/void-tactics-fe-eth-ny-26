import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Next.js stores secrets in .env.local; dotenv defaults to .env
config({ path: ".env.local" });

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
