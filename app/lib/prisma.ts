import { PrismaClient } from "../generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";

function makePrisma() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function getPrisma(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = makePrisma();
  }
  return globalForPrisma.prisma;
}

// Lazy proxy: constructing the real client (and requiring DATABASE_URL) only
// happens on first actual use, not on import. This lets web3-only builds and
// routes that never touch the DB work without a Neon connection configured.
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrisma();
    const value = Reflect.get(client, prop);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
