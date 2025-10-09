-- CreateTable
CREATE TABLE "geocode_cache" (
    "id" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "proximity" TEXT,
    "country" TEXT,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "address" TEXT NOT NULL,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "geocode_cache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "geocode_cache_query_idx" ON "geocode_cache"("query");

-- CreateIndex
CREATE INDEX "geocode_cache_expires_at_idx" ON "geocode_cache"("expires_at");

-- CreateIndex
CREATE INDEX "geocode_cache_usage_count_idx" ON "geocode_cache"("usage_count");

-- CreateIndex
CREATE UNIQUE INDEX "geocode_cache_query_proximity_country_key" ON "geocode_cache"("query", "proximity", "country");
