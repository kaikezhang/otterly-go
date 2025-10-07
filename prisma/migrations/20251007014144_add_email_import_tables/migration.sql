-- CreateTable
CREATE TABLE "email_connections" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT,
    "token_expires_at" TIMESTAMP(3),
    "scope" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "last_synced_at" TIMESTAMP(3),
    "sync_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parsed_bookings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "trip_id" TEXT,
    "booking_type" TEXT NOT NULL,
    "confirmation_number" TEXT,
    "booking_date" TIMESTAMP(3),
    "title" TEXT NOT NULL,
    "description" TEXT,
    "start_date_time" TIMESTAMP(3),
    "end_date_time" TIMESTAMP(3),
    "location" TEXT,
    "raw_email_content" TEXT NOT NULL,
    "email_subject" TEXT NOT NULL,
    "sender_email" TEXT NOT NULL,
    "parsed_data_json" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "confidence" DOUBLE PRECISION,
    "conflict_detected" BOOLEAN NOT NULL DEFAULT false,
    "error_message" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "source_message_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parsed_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "email_connections_user_id_idx" ON "email_connections"("user_id");

-- CreateIndex
CREATE INDEX "email_connections_status_idx" ON "email_connections"("status");

-- CreateIndex
CREATE UNIQUE INDEX "email_connections_user_id_provider_key" ON "email_connections"("user_id", "provider");

-- CreateIndex
CREATE INDEX "parsed_bookings_user_id_idx" ON "parsed_bookings"("user_id");

-- CreateIndex
CREATE INDEX "parsed_bookings_trip_id_idx" ON "parsed_bookings"("trip_id");

-- CreateIndex
CREATE INDEX "parsed_bookings_status_idx" ON "parsed_bookings"("status");

-- CreateIndex
CREATE INDEX "parsed_bookings_booking_type_idx" ON "parsed_bookings"("booking_type");

-- CreateIndex
CREATE INDEX "parsed_bookings_start_date_time_idx" ON "parsed_bookings"("start_date_time");

-- CreateIndex
CREATE UNIQUE INDEX "parsed_bookings_user_id_source_message_id_key" ON "parsed_bookings"("user_id", "source_message_id");

-- AddForeignKey
ALTER TABLE "email_connections" ADD CONSTRAINT "email_connections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parsed_bookings" ADD CONSTRAINT "parsed_bookings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
