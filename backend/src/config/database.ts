import { PrismaClient } from '@prisma/client';

// Runtime validation/helpful warnings for Supabase pooling vs direct connection
// Prisma schema already declares both `url = env("DATABASE_URL")` and
// `directUrl = env("DIRECT_URL")` (see backend/prisma/schema.prisma). For
// production apps on Supabase you typically want to use the pooler URL
// (postgresql://...pooler...) for runtime connections (DATABASE_URL) and the
// direct DB URL for migrations or operations that require a direct connection
// (DIRECT_URL). If both envs are identical it usually means both point to the
// pooler and some Prisma operations may fail or behave unexpectedly.

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

const dbUrl = process.env.DATABASE_URL;
const directUrl = process.env.DIRECT_URL;

if (!dbUrl) {
  console.warn('[HairLink] WARNING: DATABASE_URL is not set. Prisma will not be able to connect to the database.');
}

if (!directUrl) {
  console.warn('[HairLink] NOTICE: DIRECT_URL is not set. Some Prisma operations (migrations, certain transactions) may require a direct DB connection.');
}

if (dbUrl && directUrl && dbUrl === directUrl) {
  console.warn('[HairLink] NOTICE: DATABASE_URL and DIRECT_URL are identical. If this is a Supabase project using the pooler, consider setting DIRECT_URL to the direct (non-pooler) DB connection string for migrations.');
}

export const prisma = globalForPrisma.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
