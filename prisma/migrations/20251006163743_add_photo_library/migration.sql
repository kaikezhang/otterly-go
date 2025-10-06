-- AlterTable
ALTER TABLE "trips" ADD COLUMN     "cover_photo_id" TEXT;

-- CreateTable
CREATE TABLE "photo_library" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "source_photo_id" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "urls" JSONB NOT NULL,
    "attribution" JSONB NOT NULL,
    "tags" TEXT[],
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "photo_library_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_photos" (
    "id" TEXT NOT NULL,
    "trip_id" TEXT NOT NULL,
    "item_id" TEXT,
    "photo_id" TEXT NOT NULL,
    "display_context" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trip_photos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "photo_library_query_idx" ON "photo_library"("query");

-- CreateIndex
CREATE INDEX "photo_library_usage_count_idx" ON "photo_library"("usage_count");

-- CreateIndex
CREATE UNIQUE INDEX "photo_library_source_source_photo_id_key" ON "photo_library"("source", "source_photo_id");

-- CreateIndex
CREATE INDEX "trip_photos_trip_id_idx" ON "trip_photos"("trip_id");

-- CreateIndex
CREATE INDEX "trip_photos_photo_id_idx" ON "trip_photos"("photo_id");

-- CreateIndex
CREATE INDEX "trip_photos_item_id_idx" ON "trip_photos"("item_id");

-- CreateIndex
CREATE INDEX "trips_cover_photo_id_idx" ON "trips"("cover_photo_id");

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_cover_photo_id_fkey" FOREIGN KEY ("cover_photo_id") REFERENCES "photo_library"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_photos" ADD CONSTRAINT "trip_photos_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_photos" ADD CONSTRAINT "trip_photos_photo_id_fkey" FOREIGN KEY ("photo_id") REFERENCES "photo_library"("id") ON DELETE CASCADE ON UPDATE CASCADE;
