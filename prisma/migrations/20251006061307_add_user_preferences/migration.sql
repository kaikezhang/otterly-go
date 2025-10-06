-- AlterTable
ALTER TABLE "users" ADD COLUMN     "custom_name" TEXT,
ADD COLUMN     "custom_picture" TEXT,
ADD COLUMN     "email_notifications" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "public_profile" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "trip_reminders" BOOLEAN NOT NULL DEFAULT true;
