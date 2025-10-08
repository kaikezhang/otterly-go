-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'TICKETED', 'CANCELLED', 'COMPLETED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED');

-- CreateTable
CREATE TABLE "flight_searches" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "trip_id" TEXT,
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "depart_date" TIMESTAMP(3) NOT NULL,
    "return_date" TIMESTAMP(3),
    "passengers" INTEGER NOT NULL DEFAULT 1,
    "class" TEXT NOT NULL DEFAULT 'economy',
    "results" JSONB NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "flight_searches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flight_bookings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "trip_id" TEXT,
    "search_id" TEXT,
    "pnr" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_booking_id" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "depart_date" TIMESTAMP(3) NOT NULL,
    "return_date" TIMESTAMP(3),
    "airline" TEXT NOT NULL,
    "flight_number" TEXT NOT NULL,
    "passengers" JSONB NOT NULL,
    "seat_assignments" JSONB,
    "base_price" DECIMAL(10,2) NOT NULL,
    "taxes" DECIMAL(10,2) NOT NULL,
    "fees" DECIMAL(10,2) NOT NULL,
    "total_price" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "commission" DECIMAL(10,2) NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "payment_status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "payment_intent_id" TEXT,
    "confirmation_email" TEXT,
    "ticket_urls" JSONB,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flight_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_alerts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "depart_date" TIMESTAMP(3),
    "return_date" TIMESTAMP(3),
    "target_price" DECIMAL(10,2) NOT NULL,
    "current_price" DECIMAL(10,2),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_checked" TIMESTAMP(3),
    "triggered_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "price_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "passenger_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "date_of_birth" TIMESTAMP(3) NOT NULL,
    "passport_number" TEXT,
    "passport_expiry" TIMESTAMP(3),
    "passport_country" TEXT,
    "seat_preference" TEXT,
    "meal_preference" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "passenger_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "flight_searches_user_id_created_at_idx" ON "flight_searches"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "flight_searches_expires_at_idx" ON "flight_searches"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "flight_bookings_pnr_key" ON "flight_bookings"("pnr");

-- CreateIndex
CREATE INDEX "flight_bookings_user_id_status_idx" ON "flight_bookings"("user_id", "status");

-- CreateIndex
CREATE INDEX "flight_bookings_trip_id_idx" ON "flight_bookings"("trip_id");

-- CreateIndex
CREATE INDEX "flight_bookings_pnr_idx" ON "flight_bookings"("pnr");

-- CreateIndex
CREATE INDEX "price_alerts_user_id_is_active_idx" ON "price_alerts"("user_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "passenger_profiles_user_id_passport_number_key" ON "passenger_profiles"("user_id", "passport_number");

-- AddForeignKey
ALTER TABLE "flight_searches" ADD CONSTRAINT "flight_searches_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flight_searches" ADD CONSTRAINT "flight_searches_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flight_bookings" ADD CONSTRAINT "flight_bookings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flight_bookings" ADD CONSTRAINT "flight_bookings_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_alerts" ADD CONSTRAINT "price_alerts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "passenger_profiles" ADD CONSTRAINT "passenger_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
