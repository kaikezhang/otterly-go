import { PrismaClient } from '@prisma/client';

/**
 * Global Prisma Client instance with connection pooling
 *
 * Connection pooling is configured via DATABASE_URL query parameters:
 * - connection_limit: Max number of connections (default: num_cpus * 2 + 1)
 * - pool_timeout: Max wait time for connection in seconds (default: 10)
 *
 * Example with pooling parameters:
 * postgresql://user:password@localhost:5432/db?connection_limit=10&pool_timeout=20
 *
 * For production, consider using Prisma Data Proxy or PgBouncer for advanced pooling.
 */

// PrismaClient is attached to the global object in development to prevent
// creating multiple instances during hot reloads
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * Graceful shutdown handler
 * Call this when your server is shutting down to close database connections
 */
export async function disconnectDatabase() {
  await prisma.$disconnect();
}

// Handle process termination
process.on('SIGINT', async () => {
  await disconnectDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await disconnectDatabase();
  process.exit(0);
});
