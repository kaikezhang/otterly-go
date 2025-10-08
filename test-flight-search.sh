#!/bin/bash

# Get auth token from browser cookies first
# Visit http://localhost:5173, log in, and copy the auth_token cookie value

AUTH_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtZ2cyNjl3NjAwMDByb3kxbXUzd2k5ZDQiLCJlbWFpbCI6ImthaWtlemhhbmdAZ21haWwuY29tIiwibmFtZSI6IlpoYW5nIEthaWtlIiwicGljdHVyZSI6Imh0dHBzOi8vbGgzLmdvb2dsZXVzZXJjb250ZW50LmNvbS9hL0FDZzhvY0l2WE56bzRGTnFkd3NzaHUtUGZsRlhSOHJGVUpQUllMUEhoWkdwQ0FNWWx2Z3k3YkcxPXM5Ni1jIiwic3Vic2NyaXB0aW9uVGllciI6InBybyIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzU5ODEzMjUzLCJleHAiOjE3NjA0MTgwNTN9.v6WtzF8zVpEMHZhjtGYIrxwCPGiR7KcgXb0icfqkCGc"

echo "🔍 Testing Flight Search API..."
echo ""

curl -X POST http://localhost:3001/api/booking/search \
  -H "Content-Type: application/json" \
  -H "Cookie: auth_token=$AUTH_TOKEN" \
  -d @- << 'EOF' | python3 -m json.tool
{
  "origin": "SFO",
  "destination": "NRT",
  "departDate": "2025-12-01",
  "passengers": 1,
  "class": "economy"
}
EOF
