-- AddForeignKey
ALTER TABLE "email_logs" ADD CONSTRAINT "email_logs_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE SET NULL ON UPDATE CASCADE;
