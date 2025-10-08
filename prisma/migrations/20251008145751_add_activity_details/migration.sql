-- CreateTable
CREATE TABLE "activity_details" (
    "id" TEXT NOT NULL,
    "trip_id" TEXT NOT NULL,
    "day_index" INTEGER NOT NULL,
    "item_id" TEXT NOT NULL,
    "suggestion_card_json" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "activity_details_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "activity_details_trip_id_idx" ON "activity_details"("trip_id");

-- CreateIndex
CREATE INDEX "activity_details_item_id_idx" ON "activity_details"("item_id");

-- CreateIndex
CREATE UNIQUE INDEX "activity_details_trip_id_day_index_item_id_key" ON "activity_details"("trip_id", "day_index", "item_id");

-- AddForeignKey
ALTER TABLE "activity_details" ADD CONSTRAINT "activity_details_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;
