# Flight Booking Integration - Testing Guide

This guide shows you how to test the flight booking integration that was implemented in PR #43.

## Prerequisites

1. **Server Running**: Make sure the dev server is running:
   ```bash
   npm run dev
   ```

2. **Authentication**: You need to be logged in to test the endpoints. Get your auth token from browser cookies after logging in at http://localhost:5173

3. **Mock Data Mode**: The system uses mock flight data by default (no API key needed). To use real Duffel API, add `DUFFEL_API_KEY` to `.env`.

## Quick Test Suite

### 1. Test Flight Search (Mock Data)

Search for flights from JFK to Tokyo:

```bash
curl -X POST http://localhost:3001/api/booking/search \
  -H "Content-Type: application/json" \
  -H "Cookie: auth_token=YOUR_AUTH_TOKEN_HERE" \
  -d '{
    "origin": "JFK",
    "destination": "NRT",
    "departDate": "2025-12-01",
    "passengers": 1,
    "class": "economy"
  }'
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "flights": [
    {
      "id": "mock-flight-1-...",
      "origin": "JFK",
      "destination": "NRT",
      "departTime": "08:00 AM",
      "arriveTime": "05:30 PM",
      "duration": "9h 30m",
      "stops": 0,
      "airline": "United Airlines",
      "flightNumber": "UA 123",
      "price": 750,
      "currency": "USD",
      "badge": "Best Value",
      "provider": "duffel",
      "offerId": "mock-offer-1-..."
    },
    // ... 2 more flights
  ],
  "count": 3
}
```

### 2. Test Round-Trip Search

```bash
curl -X POST http://localhost:3001/api/booking/search \
  -H "Content-Type: application/json" \
  -H "Cookie: auth_token=YOUR_AUTH_TOKEN_HERE" \
  -d '{
    "origin": "LAX",
    "destination": "LHR",
    "departDate": "2025-11-15",
    "returnDate": "2025-11-25",
    "passengers": 2,
    "class": "business"
  }'
```

### 3. Test Flight Details

Get details for a specific flight (use an `id` from search results):

```bash
curl -X GET "http://localhost:3001/api/booking/flights/mock-flight-1-123456789" \
  -H "Cookie: auth_token=YOUR_AUTH_TOKEN_HERE"
```

**Expected Response**:
```json
{
  "success": true,
  "flight": {
    "id": "mock-flight-1-123456789",
    "origin": "JFK",
    "destination": "NRT",
    "segments": [
      {
        "origin": "JFK",
        "destination": "NRT",
        "departTime": "08:00 AM",
        "arriveTime": "05:30 PM",
        "duration": "9h 30m",
        "airline": "United Airlines",
        "flightNumber": "UA 123",
        "aircraft": "Boeing 787"
      }
    ],
    "price": {
      "basePrice": 745,
      "taxes": 86,
      "fees": 50,
      "total": 881,
      "currency": "USD"
    },
    "baggage": {
      "carryOn": "1 personal item + 1 carry-on",
      "checked": "2 checked bags included"
    },
    "amenities": ["WiFi", "In-flight entertainment", "Meals included"]
  }
}
```

### 4. Test Create Booking

Create a booking (use an `offerId` from search results):

```bash
curl -X POST http://localhost:3001/api/booking/create \
  -H "Content-Type: application/json" \
  -H "Cookie: auth_token=YOUR_AUTH_TOKEN_HERE" \
  -d '{
    "offerId": "mock-offer-1-123456789",
    "flightId": "mock-flight-1-123456789",
    "passengers": [
      {
        "firstName": "John",
        "lastName": "Doe",
        "dateOfBirth": "1990-01-15",
        "passportNumber": "N1234567",
        "passportExpiry": "2030-12-31",
        "passportCountry": "US"
      }
    ],
    "contactEmail": "john.doe@example.com",
    "totalPrice": 881
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "booking": {
    "id": "booking-...",
    "pnr": "MOCKAB1234",
    "provider": "duffel",
    "providerBookingId": "duffel-MOCKAB1234",
    "status": "confirmed",
    "origin": "JFK",
    "destination": "NRT",
    "departDate": "2025-12-01T...",
    "airline": "United Airlines",
    "flightNumber": "UA 123",
    "passengers": [...],
    "price": {
      "basePrice": 745,
      "taxes": 86,
      "fees": 50,
      "total": 881,
      "currency": "USD"
    },
    "confirmationEmail": "john.doe@example.com"
  },
  "message": "Booking created successfully"
}
```

### 5. Test Get Booking Status

Retrieve a booking by PNR (use the PNR from create response):

```bash
curl -X GET "http://localhost:3001/api/booking/MOCKAB1234" \
  -H "Cookie: auth_token=YOUR_AUTH_TOKEN_HERE"
```

**Expected Response**:
```json
{
  "success": true,
  "booking": {
    "bookingId": "MOCKAB1234",
    "pnr": "MOCKAB1234",
    "status": "confirmed",
    "flightStatus": "scheduled"
  }
}
```

### 6. Test Cancel Booking

Cancel a booking by PNR:

```bash
curl -X DELETE "http://localhost:3001/api/booking/MOCKAB1234" \
  -H "Cookie: auth_token=YOUR_AUTH_TOKEN_HERE"
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Booking cancelled successfully",
  "refund": null
}
```

## Browser Testing with Developer Console

### 1. Get Auth Token from Browser

1. Open http://localhost:5173 and log in
2. Open Developer Tools (F12)
3. Go to Application → Cookies → http://localhost:5173
4. Copy the `auth_token` value

### 2. Test in Browser Console

```javascript
// Search for flights
const searchFlights = async () => {
  const response = await fetch('http://localhost:3001/api/booking/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      origin: 'SFO',
      destination: 'NRT',
      departDate: '2025-12-01',
      passengers: 1,
      class: 'economy'
    })
  });
  const data = await response.json();
  console.log('Search Results:', data);
  return data;
};

await searchFlights();
```

```javascript
// Create a booking
const createBooking = async (offerId) => {
  const response = await fetch('http://localhost:3001/api/booking/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      offerId: offerId,
      flightId: 'mock-flight-1',
      passengers: [{
        firstName: 'Test',
        lastName: 'User',
        dateOfBirth: '1990-01-01'
      }],
      contactEmail: 'test@example.com',
      totalPrice: 500
    })
  });
  const data = await response.json();
  console.log('Booking Created:', data);
  return data;
};

// Use the offerId from search results
await createBooking('mock-offer-1-12345');
```

## Database Verification

### Check Cached Search Results

```bash
npx prisma studio
```

Then navigate to `flight_searches` table to see:
- Cached search queries
- Results stored as JSON
- Expiration timestamps

### Check Bookings

Navigate to `flight_bookings` table to verify:
- PNR codes
- Passenger data
- Price breakdown
- Booking status

### SQL Queries

```sql
-- View recent flight searches
SELECT origin, destination, depart_date, passengers, class, created_at
FROM flight_searches
ORDER BY created_at DESC
LIMIT 10;

-- View all bookings
SELECT pnr, origin, destination, airline, flight_number, status, total_price, created_at
FROM flight_bookings
ORDER BY created_at DESC;

-- Check cache hit rate
SELECT
  COUNT(*) as total_searches,
  COUNT(DISTINCT origin || '-' || destination) as unique_routes
FROM flight_searches;
```

## Testing Validation and Error Handling

### 1. Test Invalid IATA Code

```bash
curl -X POST http://localhost:3001/api/booking/search \
  -H "Content-Type: application/json" \
  -H "Cookie: auth_token=YOUR_AUTH_TOKEN_HERE" \
  -d '{
    "origin": "INVALID",
    "destination": "NRT",
    "departDate": "2025-12-01",
    "passengers": 1,
    "class": "economy"
  }'
```

**Expected**: 400 Bad Request with validation errors

### 2. Test Missing Required Fields

```bash
curl -X POST http://localhost:3001/api/booking/search \
  -H "Content-Type: application/json" \
  -H "Cookie: auth_token=YOUR_AUTH_TOKEN_HERE" \
  -d '{
    "origin": "JFK"
  }'
```

**Expected**: 400 Bad Request

### 3. Test Without Authentication

```bash
curl -X POST http://localhost:3001/api/booking/search \
  -H "Content-Type: application/json" \
  -d '{
    "origin": "JFK",
    "destination": "NRT",
    "departDate": "2025-12-01",
    "passengers": 1,
    "class": "economy"
  }'
```

**Expected**: 401 Unauthorized

### 4. Test Invalid Passenger Count

```bash
curl -X POST http://localhost:3001/api/booking/search \
  -H "Content-Type: application/json" \
  -H "Cookie: auth_token=YOUR_AUTH_TOKEN_HERE" \
  -d '{
    "origin": "JFK",
    "destination": "NRT",
    "departDate": "2025-12-01",
    "passengers": 15,
    "class": "economy"
  }'
```

**Expected**: 400 Bad Request (max 9 passengers)

## Testing with Real Duffel API

### 1. Configure Duffel API Key

Add to `.env`:
```bash
DUFFEL_API_KEY=duffel_test_your-api-key-here
```

### 2. Restart Server

```bash
# Kill the dev server and restart
npm run dev
```

### 3. Verify Real API Mode

Check server logs - you should NOT see:
```
Duffel API key not configured - using mock data
```

### 4. Test Real Flight Search

Same API calls as above, but results will come from Duffel's API with real flight data, pricing, and availability.

## Cache Testing

### 1. Test Cache Hit

```bash
# First search (cache miss)
time curl -X POST http://localhost:3001/api/booking/search \
  -H "Content-Type: application/json" \
  -H "Cookie: auth_token=YOUR_AUTH_TOKEN_HERE" \
  -d '{
    "origin": "JFK",
    "destination": "LAX",
    "departDate": "2025-12-01",
    "passengers": 1,
    "class": "economy"
  }'

# Second search (cache hit - should be much faster)
time curl -X POST http://localhost:3001/api/booking/search \
  -H "Content-Type: application/json" \
  -H "Cookie: auth_token=YOUR_AUTH_TOKEN_HERE" \
  -d '{
    "origin": "JFK",
    "destination": "LAX",
    "departDate": "2025-12-01",
    "passengers": 1,
    "class": "economy"
  }'
```

### 2. Check Server Logs

Look for:
```
Returning cached flight search results
```

## Performance Testing

### Test Response Times

```bash
# Install Apache Bench (if not installed)
brew install httpd  # macOS

# Create a test payload file
cat > flight-search.json << 'EOF'
{
  "origin": "SFO",
  "destination": "NRT",
  "departDate": "2025-12-01",
  "passengers": 1,
  "class": "economy"
}
EOF

# Run 10 concurrent requests
ab -n 100 -c 10 -T "application/json" \
  -H "Cookie: auth_token=YOUR_TOKEN" \
  -p flight-search.json \
  http://localhost:3001/api/booking/search
```

## Integration with Existing Trip Flow

Since the UI is not yet implemented, you can manually add flight bookings to trips:

### 1. Get Trip ID

```bash
curl -X GET "http://localhost:3001/api/trips" \
  -H "Cookie: auth_token=YOUR_AUTH_TOKEN_HERE"
```

### 2. Create Booking with Trip ID

```bash
curl -X POST http://localhost:3001/api/booking/create \
  -H "Content-Type: application/json" \
  -H "Cookie: auth_token=YOUR_AUTH_TOKEN_HERE" \
  -d '{
    "offerId": "mock-offer-1-123",
    "flightId": "mock-flight-1-123",
    "tripId": "YOUR_TRIP_ID_HERE",
    "passengers": [{
      "firstName": "John",
      "lastName": "Doe",
      "dateOfBirth": "1990-01-15"
    }],
    "contactEmail": "john@example.com",
    "totalPrice": 500
  }'
```

### 3. Verify in Database

```sql
SELECT * FROM flight_bookings WHERE trip_id = 'YOUR_TRIP_ID';
```

## Troubleshooting

### Server Logs

Check backend terminal for detailed logs:
- Flight search requests
- Cache hits/misses
- Database operations
- Duffel API calls (if configured)

### Common Issues

1. **401 Unauthorized**: Check auth token is valid and included in request
2. **400 Bad Request**: Check request payload matches Zod schema
3. **500 Internal Server Error**: Check server logs for detailed error
4. **Cache not working**: Verify database connection and `flight_searches` table exists
5. **Mock data not appearing**: Check Duffel API key is NOT set (or is placeholder value)

### Enable Debug Logging

Add to `.env`:
```bash
NODE_ENV=development
DEBUG=true
```

## Next Steps

After verifying the backend works:

1. **Build UI components** (see PR #43 description)
2. **Implement booking agent** for conversational flight booking
3. **Add Stripe payment integration**
4. **Create booking management UI**
5. **Add price alerts feature**
6. **Implement passenger profiles**

## API Reference Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/booking/search` | POST | Search for flights |
| `/api/booking/flights/:id` | GET | Get flight details |
| `/api/booking/create` | POST | Create a booking |
| `/api/booking/:pnr` | GET | Get booking status |
| `/api/booking/:pnr` | DELETE | Cancel booking |

All endpoints require authentication (JWT token in cookie).

## Postman Collection

You can import these requests into Postman for easier testing. Create a collection with:

1. Environment variable: `auth_token` = your JWT token
2. Add all 5 endpoints above
3. Set headers: `Cookie: auth_token={{auth_token}}`
4. Use the JSON payloads from examples above

---

**Testing Status**: ✅ Backend fully functional with mock data
**Next**: UI implementation in separate PR
