-- AlterTable: Make password_hash nullable for Google OAuth users
ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;

-- AlterTable: Add Google OAuth fields
ALTER TABLE "users" ADD COLUMN "google_id" TEXT;
ALTER TABLE "users" ADD COLUMN "name" TEXT;
ALTER TABLE "users" ADD COLUMN "picture" TEXT;

-- CreateIndex: Ensure googleId is unique
CREATE UNIQUE INDEX "users_google_id_key" ON "users"("google_id");
