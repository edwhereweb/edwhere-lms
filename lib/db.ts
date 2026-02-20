import { PrismaClient } from '@prisma/client';

const prismaClientSingleton = () => {
  // return new PrismaClient({
  //   log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error']
  // });
  return new PrismaClient();
};

declare const globalThis: {
  prisma: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

export const db = globalThis.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = db;
}
