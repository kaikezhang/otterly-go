-- CreateTable
CREATE TABLE "social_content_cache" (
    "id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "platform_post_id" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "content_lang" TEXT NOT NULL DEFAULT 'en',
    "summary" TEXT NOT NULL,
    "images" TEXT[],
    "video_url" TEXT,
    "tags" TEXT[],
    "author_name" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "author_avatar" TEXT,
    "engagement_score" INTEGER NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "comments" INTEGER NOT NULL DEFAULT 0,
    "shares" INTEGER NOT NULL DEFAULT 0,
    "post_url" TEXT NOT NULL,
    "location" TEXT,
    "published_at" TIMESTAMP(3),
    "platform_meta" JSONB,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "quality_score" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "social_content_cache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "social_content_cache_platform_idx" ON "social_content_cache"("platform");

-- CreateIndex
CREATE INDEX "social_content_cache_query_idx" ON "social_content_cache"("query");

-- CreateIndex
CREATE INDEX "social_content_cache_location_idx" ON "social_content_cache"("location");

-- CreateIndex
CREATE INDEX "social_content_cache_engagement_score_idx" ON "social_content_cache"("engagement_score");

-- CreateIndex
CREATE INDEX "social_content_cache_usage_count_idx" ON "social_content_cache"("usage_count");

-- CreateIndex
CREATE INDEX "social_content_cache_content_lang_idx" ON "social_content_cache"("content_lang");

-- CreateIndex
CREATE UNIQUE INDEX "social_content_cache_platform_platform_post_id_key" ON "social_content_cache"("platform", "platform_post_id");
