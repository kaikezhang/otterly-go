-- CreateTable
CREATE TABLE "xiaohongshu_cache" (
    "id" TEXT NOT NULL,
    "note_id" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "content_zh" TEXT,
    "summary" TEXT NOT NULL,
    "images" TEXT[],
    "tags" TEXT[],
    "author_name" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "author_avatar" TEXT,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "comments" INTEGER NOT NULL DEFAULT 0,
    "shares" INTEGER NOT NULL DEFAULT 0,
    "note_url" TEXT NOT NULL,
    "published_at" TIMESTAMP(3),
    "location" TEXT,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "xiaohongshu_cache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "xiaohongshu_cache_note_id_key" ON "xiaohongshu_cache"("note_id");

-- CreateIndex
CREATE INDEX "xiaohongshu_cache_query_idx" ON "xiaohongshu_cache"("query");

-- CreateIndex
CREATE INDEX "xiaohongshu_cache_location_idx" ON "xiaohongshu_cache"("location");

-- CreateIndex
CREATE INDEX "xiaohongshu_cache_usage_count_idx" ON "xiaohongshu_cache"("usage_count");

-- CreateIndex
CREATE INDEX "xiaohongshu_cache_created_at_idx" ON "xiaohongshu_cache"("created_at");
