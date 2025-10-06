-- AlterTable
ALTER TABLE "trips" ADD COLUMN     "archived_at" TIMESTAMP(3),
ADD COLUMN     "display_order" INTEGER,
ADD COLUMN     "last_viewed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'draft',
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ALTER COLUMN "start_date" DROP NOT NULL,
ALTER COLUMN "end_date" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "trips_user_id_status_idx" ON "trips"("user_id", "status");

-- CreateIndex
CREATE INDEX "trips_start_date_idx" ON "trips"("start_date");

-- CreateIndex
CREATE INDEX "trips_last_viewed_at_idx" ON "trips"("last_viewed_at");
