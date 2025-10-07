/**
 * Email Parser Service (Milestone 5.1)
 * Uses GPT to extract booking information from email content
 */

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ParsedBookingData {
  bookingType: 'flight' | 'hotel' | 'car_rental' | 'restaurant' | 'activity';
  title: string;
  description?: string;
  confirmationNumber?: string;
  bookingDate?: string; // ISO date string
  startDateTime?: string; // ISO datetime string
  endDateTime?: string; // ISO datetime string
  location?: string;
  confidence: number; // 0-1
  extractedData: Record<string, any>; // Type-specific details
}

export interface FlightData {
  airline: string;
  flightNumber: string;
  departureAirport: string;
  arrivalAirport: string;
  departureTime: string;
  arrivalTime: string;
  seatNumber?: string;
  gate?: string;
  terminal?: string;
}

export interface HotelData {
  hotelName: string;
  address: string;
  checkInDate: string;
  checkOutDate: string;
  checkInTime?: string;
  checkOutTime?: string;
  roomType?: string;
  numberOfNights?: number;
  numberOfGuests?: number;
}

export interface CarRentalData {
  company: string;
  pickupLocation: string;
  dropoffLocation: string;
  pickupDateTime: string;
  dropoffDateTime: string;
  vehicleType?: string;
}

export interface RestaurantData {
  restaurantName: string;
  address: string;
  reservationDateTime: string;
  numberOfGuests?: number;
  specialRequests?: string;
}

export interface ActivityData {
  activityName: string;
  provider: string;
  location: string;
  dateTime: string;
  duration?: string;
  numberOfGuests?: number;
}

const PARSING_SYSTEM_PROMPT = `You are an expert at extracting structured booking information from travel confirmation emails.

Analyze the email content and extract booking details. Return a JSON object with this structure:

{
  "bookingType": "flight" | "hotel" | "car_rental" | "restaurant" | "activity",
  "title": "Brief title (e.g., 'United Airlines UA123' or 'Hilton Tokyo')",
  "description": "Additional details",
  "confirmationNumber": "Booking reference code",
  "bookingDate": "ISO date when booking was made",
  "startDateTime": "ISO datetime for departure/check-in/reservation",
  "endDateTime": "ISO datetime for arrival/check-out (null for restaurants)",
  "location": "City, venue address, or location",
  "confidence": 0-1 score of parsing confidence,
  "extractedData": {
    // Type-specific fields based on bookingType
  }
}

## Type-Specific Fields

### flight:
{
  "airline": "United Airlines",
  "flightNumber": "UA123",
  "departureAirport": "SFO",
  "arrivalAirport": "NRT",
  "departureTime": "ISO datetime",
  "arrivalTime": "ISO datetime",
  "seatNumber": "12A",
  "gate": "G12",
  "terminal": "Terminal 3"
}

### hotel:
{
  "hotelName": "Hilton Tokyo",
  "address": "Full address",
  "checkInDate": "ISO date",
  "checkOutDate": "ISO date",
  "checkInTime": "15:00",
  "checkOutTime": "11:00",
  "roomType": "Deluxe King",
  "numberOfNights": 3,
  "numberOfGuests": 2
}

### car_rental:
{
  "company": "Hertz",
  "pickupLocation": "SFO Airport",
  "dropoffLocation": "SFO Airport",
  "pickupDateTime": "ISO datetime",
  "dropoffDateTime": "ISO datetime",
  "vehicleType": "Toyota Camry or Similar"
}

### restaurant:
{
  "restaurantName": "Sukiyabashi Jiro",
  "address": "Full address",
  "reservationDateTime": "ISO datetime",
  "numberOfGuests": 2,
  "specialRequests": "Window seat"
}

### activity:
{
  "activityName": "Tokyo Walking Tour",
  "provider": "Viator",
  "location": "Shibuya, Tokyo",
  "dateTime": "ISO datetime",
  "duration": "3 hours",
  "numberOfGuests": 2
}

## Important Rules:
1. Use ISO 8601 format for all dates/times (e.g., "2025-10-15T14:30:00Z")
2. If year is missing, infer from context or use current year
3. Confidence should be 0.9+ for clear confirmations, 0.5-0.8 for ambiguous, <0.5 for unclear
4. If email is not a booking confirmation, return confidence: 0
5. Extract all available information, use null for missing fields
6. For flights, convert airport names to IATA codes when possible
7. Normalize hotel/restaurant names (proper capitalization)

Return ONLY valid JSON, no explanations.`;

/**
 * Parse email content to extract booking information
 */
export async function parseEmailContent(
  emailContent: string,
  emailSubject: string,
  senderEmail: string
): Promise<ParsedBookingData | null> {
  try {
    const userPrompt = `Subject: ${emailSubject}
From: ${senderEmail}

Email Content:
${emailContent}`;

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: PARSING_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.1, // Low temperature for consistent extraction
      response_format: { type: 'json_object' },
    });

    const responseContent = completion.choices[0].message.content;
    if (!responseContent) {
      throw new Error('No response from OpenAI');
    }

    const parsed: ParsedBookingData = JSON.parse(responseContent);

    // Validate confidence threshold
    if (parsed.confidence < 0.3) {
      console.log(`Low confidence parsing (${parsed.confidence}), rejecting`);
      return null;
    }

    return parsed;
  } catch (error) {
    console.error('Email parsing error:', error);
    throw error;
  }
}

/**
 * Detect if an email is likely a booking confirmation
 * (Quick filter before full parsing)
 */
export function isLikelyBookingEmail(
  emailSubject: string,
  senderEmail: string
): boolean {
  const subjectKeywords = [
    'confirmation',
    'booking',
    'reservation',
    'itinerary',
    'ticket',
    'receipt',
    'eticket',
    'check-in',
    'reservation confirmed',
    'your trip',
    'upcoming',
  ];

  const senderDomains = [
    // Airlines
    'united.com',
    'delta.com',
    'aa.com',
    'southwest.com',
    'lufthansa.com',
    'emirates.com',
    'airfrance.com',
    'britishairways.com',
    'ana.co.jp',
    'jal.co.jp',
    // Hotels
    'hilton.com',
    'marriott.com',
    'hyatt.com',
    'ihg.com',
    'airbnb.com',
    'booking.com',
    'hotels.com',
    'expedia.com',
    // Car Rentals
    'hertz.com',
    'enterprise.com',
    'avis.com',
    'budget.com',
    'nationalcar.com',
    // Restaurants
    'opentable.com',
    'resy.com',
    'sevenrooms.com',
    // Activities
    'viator.com',
    'getyourguide.com',
    'tripadvisor.com',
    'klook.com',
  ];

  const subjectLower = emailSubject.toLowerCase();
  const hasKeyword = subjectKeywords.some((keyword) =>
    subjectLower.includes(keyword)
  );

  const hasSenderDomain = senderDomains.some((domain) =>
    senderEmail.toLowerCase().includes(domain)
  );

  return hasKeyword || hasSenderDomain;
}
