-- AlterTable
ALTER TABLE "trips" ADD COLUMN     "public_share_token" TEXT,
ADD COLUMN     "share_password" TEXT,
ADD COLUMN     "share_expires_at" TIMESTAMP(3),
ADD COLUMN     "share_view_count" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "trips_public_share_token_key" ON "trips"("public_share_token");

-- CreateIndex
CREATE INDEX "trips_public_share_token_idx" ON "trips"("public_share_token");
