import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.DIRECT_URL ||
  process.env.POSTGRES_URL_NON_POOLING;
const isBuildPhase = process.env.npm_lifecycle_event === 'build';
const fallbackConnectionString = 'postgresql://placeholder:placeholder@127.0.0.1:5432/placeholder';
const resolvedConnectionString =
  connectionString || (isBuildPhase ? fallbackConnectionString : undefined);

if (!resolvedConnectionString) {
  throw new Error('Missing DATABASE_URL for Prisma.');
}

const poolSize = Number.parseInt(process.env.PG_POOL_SIZE || '', 10);
const shouldUseSsl =
  resolvedConnectionString.includes('sslmode=require') ||
  resolvedConnectionString.includes('ssl=true') ||
  process.env.PGSSL === 'true';

const pool = new pg.Pool({
  connectionString: resolvedConnectionString,
  max: Number.isFinite(poolSize) && poolSize > 0 ? poolSize : 10,
  ssl: shouldUseSsl ? { rejectUnauthorized: false } : undefined
});
const adapter = new PrismaPg(pool);

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const shouldLogPrismaQueries =
  process.env.PRISMA_LOG_QUERIES === 'true' || process.env.DEBUG?.includes('prisma:query');
const prismaLogLevel: Prisma.LogLevel[] =
  process.env.NODE_ENV === 'development'
    ? shouldLogPrismaQueries
      ? ['query', 'error', 'warn']
      : ['error', 'warn']
    : ['error'];

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
    log: prismaLogLevel,
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
