-- AlterTable
ALTER TABLE "trips" ADD COLUMN     "duration" INTEGER,
ADD COLUMN     "estimated_budget" TEXT,
ADD COLUMN     "fork_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "interests" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "is_premium" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_public" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_template" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "original_trip_id" TEXT,
ADD COLUMN     "revenue_share" DECIMAL(5,2),
ADD COLUMN     "save_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "season" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "template_category" TEXT,
ADD COLUMN     "view_count" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "trip_reviews" (
    "id" TEXT NOT NULL,
    "trip_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "helpful_count" INTEGER NOT NULL DEFAULT 0,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trip_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_trips" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "trip_id" TEXT NOT NULL,
    "folder" TEXT NOT NULL DEFAULT 'inspiration',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_trips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_follows" (
    "id" TEXT NOT NULL,
    "follower_id" TEXT NOT NULL,
    "following_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_follows_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "trip_reviews_trip_id_idx" ON "trip_reviews"("trip_id");

-- CreateIndex
CREATE INDEX "trip_reviews_user_id_idx" ON "trip_reviews"("user_id");

-- CreateIndex
CREATE INDEX "trip_reviews_rating_idx" ON "trip_reviews"("rating");

-- CreateIndex
CREATE UNIQUE INDEX "trip_reviews_trip_id_user_id_key" ON "trip_reviews"("trip_id", "user_id");

-- CreateIndex
CREATE INDEX "saved_trips_user_id_idx" ON "saved_trips"("user_id");

-- CreateIndex
CREATE INDEX "saved_trips_trip_id_idx" ON "saved_trips"("trip_id");

-- CreateIndex
CREATE INDEX "saved_trips_folder_idx" ON "saved_trips"("folder");

-- CreateIndex
CREATE UNIQUE INDEX "saved_trips_user_id_trip_id_key" ON "saved_trips"("user_id", "trip_id");

-- CreateIndex
CREATE INDEX "user_follows_follower_id_idx" ON "user_follows"("follower_id");

-- CreateIndex
CREATE INDEX "user_follows_following_id_idx" ON "user_follows"("following_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_follows_follower_id_following_id_key" ON "user_follows"("follower_id", "following_id");

-- CreateIndex
CREATE INDEX "trips_is_template_is_public_idx" ON "trips"("is_template", "is_public");

-- CreateIndex
CREATE INDEX "trips_template_category_idx" ON "trips"("template_category");

-- CreateIndex
CREATE INDEX "trips_view_count_idx" ON "trips"("view_count");

-- CreateIndex
CREATE INDEX "trips_fork_count_idx" ON "trips"("fork_count");

-- CreateIndex
CREATE INDEX "trips_save_count_idx" ON "trips"("save_count");

-- CreateIndex
CREATE INDEX "trips_original_trip_id_idx" ON "trips"("original_trip_id");

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_original_trip_id_fkey" FOREIGN KEY ("original_trip_id") REFERENCES "trips"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_reviews" ADD CONSTRAINT "trip_reviews_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_reviews" ADD CONSTRAINT "trip_reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_trips" ADD CONSTRAINT "saved_trips_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_trips" ADD CONSTRAINT "saved_trips_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_follows" ADD CONSTRAINT "user_follows_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_follows" ADD CONSTRAINT "user_follows_following_id_fkey" FOREIGN KEY ("following_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
