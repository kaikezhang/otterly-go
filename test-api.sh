#!/bin/bash

AUTH_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtZ2cyNjl3NjAwMDByb3kxbXUzd2k5ZDQiLCJlbWFpbCI6ImthaWtlemhhbmdAZ21haWwuY29tIiwibmFtZSI6IlpoYW5nIEthaWtlIiwicGljdHVyZSI6Imh0dHBzOi8vbGgzLmdvb2dsZXVzZXJjb250ZW50LmNvbS9hL0FDZzhvY0l2WE56bzRGTnFkd3NzaHUtUGZsRlhSOHJGVUpQUllMUEhoWkdwQ0FNWWx2Z3k3YkcxPXM5Ni1jIiwic3Vic2NyaXB0aW9uVGllciI6InBybyIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzU5ODEzMjUzLCJleHAiOjE3NjA0MTgwNTN9.v6WtzF8zVpEMHZhjtGYIrxwCPGiR7KcgXb0icfqkCGc"

echo "======================================"
echo "Testing Flight Booking API"
echo "======================================"
echo ""

echo "1. Testing Flight Search (PHL to Lima)"
echo "--------------------------------------"
curl -s -X POST http://localhost:3001/api/booking/search \
  -H "Content-Type: application/json" \
  -H "Cookie: auth_token=$AUTH_TOKEN" \
  -d '{
    "origin": "PHL",
    "destination": "LIM",
    "departDate": "2025-11-01",
    "passengers": 1,
    "class": "economy"
  }' | python3 -m json.tool

echo ""
echo ""
echo "2. Testing Flight Details"
echo "--------------------------------------"

# First get a flight ID from the search
FLIGHT_ID=$(curl -s -X POST http://localhost:3001/api/booking/search \
  -H "Content-Type: application/json" \
  -H "Cookie: auth_token=$AUTH_TOKEN" \
  -d '{
    "origin": "SFO",
    "destination": "NRT",
    "departDate": "2025-12-01",
    "passengers": 1,
    "class": "economy"
  }' | python3 -c "import sys, json; data=json.load(sys.stdin); print(data['flights'][0]['id'])")

echo "Flight ID: $FLIGHT_ID"
echo ""

curl -s -X GET "http://localhost:3001/api/booking/flights/$FLIGHT_ID" \
  -H "Cookie: auth_token=$AUTH_TOKEN" | python3 -m json.tool

echo ""
echo ""
echo "3. Testing Booking Creation"
echo "--------------------------------------"

# Get offer ID
OFFER_ID=$(curl -s -X POST http://localhost:3001/api/booking/search \
  -H "Content-Type: application/json" \
  -H "Cookie: auth_token=$AUTH_TOKEN" \
  -d '{
    "origin": "JFK",
    "destination": "LAX",
    "departDate": "2025-12-15",
    "passengers": 1,
    "class": "economy"
  }' | python3 -c "import sys, json; data=json.load(sys.stdin); print(data['flights'][0]['offerId'])")

echo "Offer ID: $OFFER_ID"
echo ""

curl -s -X POST http://localhost:3001/api/booking/create \
  -H "Content-Type: application/json" \
  -H "Cookie: auth_token=$AUTH_TOKEN" \
  -d '{
    "offerId": "'"$OFFER_ID"'",
    "flightId": "test-flight-123",
    "passengers": [{
      "firstName": "John",
      "lastName": "Doe",
      "dateOfBirth": "1990-01-15"
    }],
    "contactEmail": "john.doe@example.com",
    "totalPrice": 500
  }' | python3 -m json.tool

echo ""
echo ""
echo "======================================"
echo "API Tests Complete!"
echo "======================================"
