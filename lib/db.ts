import { PrismaClient } from '@prisma/client';

const prismaClientSingleton = () => {
  return new PrismaClient();
};

declare const globalThis: {
  prisma: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

export const db = globalThis.prisma ?? prismaClientSingleton();

// Cache in every env: Next.js can evaluate this module more than once per server
// process (separate bundles), and each extra client opens its own connection pool.
globalThis.prisma = db;
