# Flight Booking Integration - Implementation Plan
**Phase 7.1: Flight Search & Booking**

## Executive Summary

This document outlines the comprehensive plan for implementing flight booking functionality in OtterlyGo, transforming it from a planning tool into a complete booking platform.

**Key Goals:**
- Enable conversational flight booking within existing chat interface
- Integrate multi-provider flight APIs (Duffel primary, Kiwi.com backup)
- Maintain UX consistency with existing trip planning flow
- Generate revenue through booking commissions (1-3% or $5-15 markup)
- Auto-sync bookings to trip itinerary

---

## 1. Architecture Overview

### 1.1 Multi-Agent System

**Agent Types:**

1. **Trip Planning Agent** (Existing)
   - Handles: Itinerary creation, modifications, suggestions, general questions
   - Model: GPT-4o-mini
   - Endpoint: `POST /api/chat`
   - Context: Trip data, user preferences, conversation history

2. **Booking Agent** (New) ⭐
   - Handles: Flight search, booking flow, payment, confirmations
   - Model: GPT-4o (better reasoning for complex bookings)
   - Endpoint: `POST /api/booking/chat`
   - Context: Search criteria, flight results, passenger info, payment status
   - State Machine: `SEARCHING → SELECTING → PASSENGER_INFO → PAYMENT → CONFIRMED`

**Agent Routing Logic:**
```typescript
// src/services/agentRouter.ts
function routeMessage(message: string, currentContext: AgentContext): AgentType {
  // Keywords: "book flight", "find flights", "flight to", "fly to"
  if (isBookingIntent(message)) return 'booking'

  // Stay in booking mode unless explicit exit
  if (currentContext.agent === 'booking' && !isExitBooking(message)) return 'booking'

  return 'planning'
}
```

### 1.2 Backend Architecture

**New Routes:**
```
POST   /api/booking/chat           # Booking agent endpoint
POST   /api/booking/search         # Direct flight search
GET    /api/booking/flights/:id    # Get flight details
POST   /api/booking/create         # Create booking
GET    /api/booking/:id            # Get booking status
DELETE /api/booking/:id            # Cancel booking
POST   /api/booking/alerts         # Create price alert
GET    /api/booking/alerts         # List price alerts
```

**Service Layer Structure:**
```
server/services/flightApi/
├── duffel.ts              # Duffel API client (primary)
├── kiwi.ts                # Kiwi.com adapter (backup)
├── amadeus.ts             # Amadeus adapter (future)
├── aggregator.ts          # Multi-provider search/failover
├── cache.ts               # Search result caching (15-30min TTL)
└── webhooks.ts            # Booking status updates from providers
```

**Provider Abstraction Interface:**
```typescript
interface FlightProvider {
  search(criteria: SearchCriteria): Promise<Flight[]>
  getDetails(flightId: string): Promise<FlightDetails>
  createBooking(request: BookingRequest): Promise<Booking>
  getBooking(pnr: string): Promise<BookingStatus>
  cancelBooking(pnr: string): Promise<CancelResult>
}
```

---

## 2. Database Schema

### 2.1 New Tables

```prisma
// Flight search caching
model FlightSearch {
  id          String   @id @default(cuid())
  userId      String
  tripId      String?

  // Search criteria
  origin      String
  destination String
  departDate  DateTime
  returnDate  DateTime?
  passengers  Int      @default(1)
  class       String   @default("economy") // economy, business, first

  // Results (cached)
  results     Json     // Array of flight options
  expiresAt   DateTime

  createdAt   DateTime @default(now())

  user User @relation(fields: [userId], references: [id])
  trip Trip? @relation(fields: [tripId], references: [id])

  @@index([userId, createdAt])
  @@index([expiresAt])
}

// Flight bookings
model FlightBooking {
  id                String        @id @default(cuid())
  userId            String
  tripId            String?
  searchId          String?

  // Booking reference
  pnr               String        @unique
  provider          String        // 'duffel', 'kiwi', 'amadeus'
  providerBookingId String

  // Flight details (denormalized for easy access)
  origin            String
  destination       String
  departDate        DateTime
  returnDate        DateTime?
  airline           String
  flightNumber      String
  passengers        Json          // Array of passenger objects
  seatAssignments   Json?         // Seat selections

  // Pricing
  basePrice         Decimal       @db.Decimal(10, 2)
  taxes             Decimal       @db.Decimal(10, 2)
  fees              Decimal       @db.Decimal(10, 2)
  totalPrice        Decimal       @db.Decimal(10, 2)
  currency          String        @default("USD")
  commission        Decimal       @db.Decimal(10, 2) // Our revenue

  // Status
  status            BookingStatus @default(PENDING)
  paymentStatus     PaymentStatus @default(PENDING)
  paymentIntentId   String?       // Stripe payment intent

  // Documents
  confirmationEmail String?
  ticketUrls        Json?         // E-ticket PDFs

  // Metadata
  metadata          Json?         // Extra provider-specific data

  createdAt         DateTime      @default(now())
  updatedAt         DateTime      @updatedAt

  user User @relation(fields: [userId], references: [id])
  trip Trip? @relation(fields: [tripId], references: [id])

  @@index([userId, status])
  @@index([tripId])
  @@index([pnr])
}

enum BookingStatus {
  PENDING           // Awaiting payment
  CONFIRMED         // Payment successful, booking confirmed
  TICKETED          // E-tickets issued
  CANCELLED         // User cancelled
  COMPLETED         // Flight departed
  REFUNDED          // Refund processed
}

enum PaymentStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
  REFUNDED
}

// Price tracking alerts
model PriceAlert {
  id          String   @id @default(cuid())
  userId      String

  // Route details
  origin      String
  destination String
  departDate  DateTime?  // Optional for flexible dates
  returnDate  DateTime?

  // Alert criteria
  targetPrice Decimal  @db.Decimal(10, 2)
  currentPrice Decimal? @db.Decimal(10, 2)

  // Status
  isActive    Boolean  @default(true)
  lastChecked DateTime?
  triggeredAt DateTime?

  createdAt   DateTime @default(now())

  user User @relation(fields: [userId], references: [id])

  @@index([userId, isActive])
}

// Passenger profiles (for faster repeat bookings)
model PassengerProfile {
  id              String   @id @default(cuid())
  userId          String

  // Personal info
  firstName       String
  lastName        String
  dateOfBirth     DateTime

  // Travel documents
  passportNumber  String?
  passportExpiry  DateTime?
  passportCountry String?

  // Preferences
  seatPreference  String?  // window, aisle, middle
  mealPreference  String?  // vegetarian, kosher, etc.

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  user User @relation(fields: [userId], references: [id])

  @@unique([userId, passportNumber])
}
```

### 2.2 Schema Migrations

```bash
# Create migration
npx prisma migrate dev --name add_flight_booking_tables

# Apply to production
npx prisma migrate deploy
```

---

## 3. Backend Implementation

### 3.1 Flight Provider Service (Duffel)

**File: `server/services/flightApi/duffel.ts`**

```typescript
import { Duffel } from '@duffel/api'

export class DuffelProvider implements FlightProvider {
  private client: Duffel

  constructor() {
    this.client = new Duffel({
      token: process.env.DUFFEL_API_KEY!
    })
  }

  async search(criteria: SearchCriteria): Promise<Flight[]> {
    const response = await this.client.offerRequests.create({
      slices: [
        {
          origin: criteria.origin,
          destination: criteria.destination,
          departure_date: criteria.departDate.toISOString().split('T')[0]
        }
      ],
      passengers: [{ type: 'adult' }],
      cabin_class: criteria.class
    })

    return this.mapDuffelOffers(response.data.offers)
  }

  async createBooking(request: BookingRequest): Promise<Booking> {
    // Create Duffel order
    const order = await this.client.orders.create({
      selected_offers: [request.offerId],
      passengers: request.passengers,
      payments: [
        {
          type: 'balance',
          amount: request.totalPrice,
          currency: 'USD'
        }
      ]
    })

    return this.mapDuffelOrder(order.data)
  }

  // ... other methods
}
```

### 3.2 Booking Agent Endpoint

**File: `server/routes/booking.ts`**

```typescript
import express from 'express'
import { authenticateToken } from '../middleware/auth'
import { FlightAggregator } from '../services/flightApi/aggregator'
import OpenAI from 'openai'

const router = express.Router()
const flightService = new FlightAggregator()
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// Booking agent chat endpoint
router.post('/chat', authenticateToken, async (req, res) => {
  const { message, conversationHistory, bookingContext } = req.body

  const systemPrompt = `You are OtterlyGo's flight booking assistant...`

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: message }
    ],
    response_format: { type: 'json_object' }
  })

  const response = JSON.parse(completion.choices[0].message.content!)

  // Handle different response types
  if (response.type === 'search_flights') {
    const flights = await flightService.search(response.criteria)
    return res.json({ ...response, flights })
  }

  if (response.type === 'create_booking') {
    const booking = await flightService.createBooking(response.bookingRequest)
    return res.json({ ...response, booking })
  }

  res.json(response)
})

// Direct search endpoint (non-conversational)
router.post('/search', authenticateToken, async (req, res) => {
  const flights = await flightService.search(req.body)
  res.json({ flights })
})

// Create booking
router.post('/create', authenticateToken, async (req, res) => {
  const booking = await flightService.createBooking(req.body)

  // Auto-add to trip if tripId provided
  if (req.body.tripId) {
    await addFlightToItinerary(req.body.tripId, booking)
  }

  res.json({ booking })
})

export default router
```

### 3.3 Booking Agent System Prompt

```typescript
const BOOKING_AGENT_PROMPT = `
You are OtterlyGo's flight booking assistant. Help users search, select, and book flights conversationally.

## Response Formats

Always respond with valid JSON in one of these formats:

### 1. SEARCH PHASE
When user wants to search flights, extract criteria and respond:
{
  "type": "search_flights",
  "message": "I'll search for flights from NYC to Tokyo...",
  "criteria": {
    "origin": "JFK",
    "destination": "NRT",
    "departDate": "2024-03-15",
    "returnDate": "2024-03-22",
    "passengers": 1,
    "class": "economy"
  }
}

### 2. FLIGHT OPTIONS
When showing results:
{
  "type": "flight_options",
  "message": "I found 5 flights. Here are the best options:",
  "highlight": "option_1" // Which to emphasize
}

### 3. PASSENGER INFO
When collecting passenger details:
{
  "type": "passenger_form",
  "message": "Great choice! I need passenger details.",
  "fields": ["full_name", "date_of_birth", "passport"]
}

### 4. PAYMENT
When ready for payment:
{
  "type": "payment_required",
  "message": "Ready to complete your booking?",
  "summary": {
    "flight": "UA 79 JFK-NRT",
    "total": 881.00,
    "breakdown": {...}
  }
}

### 5. CONFIRMATION
After successful booking:
{
  "type": "booking_confirmed",
  "message": "✅ Booking confirmed! PNR: ABC123",
  "booking_id": "booking_xyz",
  "next_steps": ["download_ticket", "set_reminder", "view_itinerary"]
}

## Conversation Guidelines

- Ask ONE question at a time for missing info
- Validate dates (not in past, return after departure)
- Suggest alternatives if no results found
- Explain price changes clearly
- Confirm critical details before booking
- Be concise but friendly

## Smart Features

- If dates flexible: Suggest cheaper nearby dates
- If expensive: Offer price alerts
- Multi-city support: Handle complex routing
- Bundle suggestions: "Save $X by flying Tuesday instead"
`
```

---

## 4. Frontend Implementation

### 4.1 Component Architecture

**New Components:**

```
src/components/booking/
├── BookingModeIndicator.tsx     # Sticky header showing booking mode
├── FlightSearchCard.tsx         # Inline search form in chat
├── FlightResultCard.tsx         # Individual flight option
├── FlightResultsList.tsx        # List of search results
├── FlightDetailsPanel.tsx       # Expanded flight info (seats, baggage)
├── SeatSelectionMap.tsx         # Visual seat picker
├── PassengerForm.tsx            # Passenger info collection
├── BookingSummary.tsx           # Pre-payment review screen
├── BookingConfirmation.tsx      # Success screen with PNR
├── PriceAlertCard.tsx           # Price tracking setup
└── BookingHistoryList.tsx       # User's past bookings
```

### 4.2 Agent Router Service

**File: `src/services/agentRouter.ts`**

```typescript
export type AgentType = 'planning' | 'booking'

export interface AgentContext {
  agent: AgentType
  conversationId: string
  state: string
  metadata?: Record<string, any>
}

const BOOKING_KEYWORDS = [
  'book flight', 'find flight', 'search flight',
  'fly to', 'flight to', 'book ticket',
  'plane ticket', 'airline'
]

const EXIT_KEYWORDS = [
  'exit booking', 'stop booking', 'back to planning',
  'cancel booking', 'go back'
]

export function routeMessage(
  message: string,
  currentContext: AgentContext
): AgentType {
  const lowerMessage = message.toLowerCase()

  // Check for explicit exit
  if (EXIT_KEYWORDS.some(kw => lowerMessage.includes(kw))) {
    return 'planning'
  }

  // Check for booking intent
  if (BOOKING_KEYWORDS.some(kw => lowerMessage.includes(kw))) {
    return 'booking'
  }

  // Stay in current mode if already in booking
  if (currentContext.agent === 'booking') {
    return 'booking'
  }

  return 'planning'
}
```

### 4.3 Booking Engine Service

**File: `src/services/bookingEngine.ts`**

```typescript
export class BookingEngine {
  async sendMessage(
    message: string,
    context: AgentContext
  ): Promise<BookingResponse> {
    const response = await fetch('/api/booking/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        conversationHistory: context.history,
        bookingContext: context.metadata
      })
    })

    return response.json()
  }

  async searchFlights(criteria: SearchCriteria): Promise<Flight[]> {
    const response = await fetch('/api/booking/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(criteria)
    })

    return response.json()
  }

  async createBooking(request: BookingRequest): Promise<Booking> {
    const response = await fetch('/api/booking/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    })

    return response.json()
  }
}
```

### 4.4 Main App Integration

**File: `src/pages/Home.tsx` (modifications)**

```typescript
import { routeMessage } from '../services/agentRouter'
import { BookingEngine } from '../services/bookingEngine'

export default function Home() {
  const [agentContext, setAgentContext] = useState<AgentContext>({
    agent: 'planning',
    conversationId: uuidv4(),
    state: 'initial'
  })

  const bookingEngine = new BookingEngine()

  const handleMessage = async (message: string) => {
    // Route to appropriate agent
    const targetAgent = routeMessage(message, agentContext)

    if (targetAgent === 'booking') {
      // Switch to booking mode
      setAgentContext({
        agent: 'booking',
        conversationId: agentContext.conversationId,
        state: 'searching'
      })

      const response = await bookingEngine.sendMessage(message, agentContext)

      // Render booking-specific UI based on response.type
      handleBookingResponse(response)

    } else {
      // Existing planning flow
      const response = await conversationEngine.sendMessage(message)
      handlePlanningResponse(response)
    }
  }

  return (
    <div className="flex h-screen">
      {/* Booking mode indicator */}
      {agentContext.agent === 'booking' && <BookingModeIndicator />}

      {/* Existing chat/itinerary/map layout */}
      <Chat onSendMessage={handleMessage} agent={agentContext.agent} />
      <ItineraryView />
      <MapView />
    </div>
  )
}
```

---

## 5. UX/UI Design Specifications

### 5.1 Design Principles

1. **Conversational-First, Forms-Optional** - Book entirely via chat OR visual forms
2. **Progressive Disclosure** - Show complexity only when needed
3. **Mobile-First** - Optimized for mobile booking
4. **Trust Signals** - Clear pricing, no hidden fees, security badges
5. **Speed** - <2s search results, instant UI feedback

### 5.2 Visual Design System

**Color Palette:**
```css
/* Booking Mode */
--booking-primary: #0066FF;      /* Flight Blue */
--booking-success: #00C853;      /* Booking Green */
--booking-warning: #FFB300;      /* Price Alert Orange */
--booking-error: #D32F2F;        /* Validation Red */

/* Planning Mode (Existing) */
--planning-primary: #10B981;     /* Otterly Green */
```

**Component Styling:**

```typescript
// Booking Mode Indicator
const BookingModeIndicator = () => (
  <div className="sticky top-0 z-50 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-3 flex items-center justify-between">
    <div className="flex items-center gap-2">
      <span className="text-2xl">✈️</span>
      <span className="font-medium">Flight Booking Mode</span>
    </div>
    <button
      onClick={exitBookingMode}
      className="text-sm underline hover:text-blue-100"
    >
      Exit to Trip Planning →
    </button>
  </div>
)
```

### 5.3 Key UI Components

#### Flight Search Card (Inline in Chat)
```tsx
const FlightSearchCard = ({ initialData }: { initialData?: Partial<SearchCriteria> }) => (
  <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
    <div className="flex items-center gap-2 text-lg font-medium">
      <span>✈️</span>
      <span>Flight Search</span>
    </div>

    <div className="grid grid-cols-2 gap-3">
      <input
        type="text"
        placeholder="From: NYC"
        defaultValue={initialData?.origin}
        className="px-3 py-2 border rounded-md"
      />
      <input
        type="text"
        placeholder="To: Tokyo"
        defaultValue={initialData?.destination}
        className="px-3 py-2 border rounded-md"
      />
    </div>

    <input
      type="date"
      placeholder="Departure - Return"
      className="w-full px-3 py-2 border rounded-md"
    />

    <div className="flex gap-3">
      <select className="flex-1 px-3 py-2 border rounded-md">
        <option>1 passenger</option>
        <option>2 passengers</option>
      </select>
      <select className="flex-1 px-3 py-2 border rounded-md">
        <option>Economy</option>
        <option>Business</option>
      </select>
    </div>

    <button className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700">
      🔍 Search Flights
    </button>
  </div>
)
```

#### Flight Result Card
```tsx
const FlightResultCard = ({ flight }: { flight: Flight }) => (
  <div className="bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-400 transition-colors">
    <div className="flex items-center justify-between mb-3">
      <div>
        <span className="text-2xl font-bold">${flight.price}</span>
        {flight.badge && (
          <span className="ml-2 text-sm bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
            {flight.badge} 🏆
          </span>
        )}
      </div>
    </div>

    <div className="text-gray-600 mb-3">
      <div className="flex items-center justify-between">
        <span className="font-medium">{flight.departTime}</span>
        <div className="flex-1 mx-4 border-t border-gray-300 relative">
          <span className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white px-2">
            ✈️
          </span>
        </div>
        <span className="font-medium">{flight.arriveTime}</span>
      </div>
      <div className="text-sm mt-1">
        {flight.duration} • {flight.stops === 0 ? 'Nonstop' : `${flight.stops} stop(s)`}
      </div>
    </div>

    <div className="flex items-center justify-between text-sm">
      <span>{flight.airline} • {flight.flightNumber}</span>
      <div className="flex gap-2">
        <button className="text-blue-600 hover:underline">View Details</button>
        <button className="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700">
          Select →
        </button>
      </div>
    </div>
  </div>
)
```

#### Booking Confirmation
```tsx
const BookingConfirmation = ({ booking }: { booking: Booking }) => (
  <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
    <div className="text-6xl mb-4">✅</div>
    <h2 className="text-2xl font-bold mb-2">Booking Confirmed!</h2>
    <p className="text-gray-600 mb-6">Confirmation: {booking.pnr}</p>

    <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
      <div className="font-medium mb-2">✈️ {booking.airline} {booking.flightNumber}</div>
      <div className="text-sm text-gray-600">
        {booking.route} • {formatDate(booking.departDate)}
      </div>
    </div>

    <div className="grid grid-cols-2 gap-3 mb-6">
      <button className="border border-gray-300 px-4 py-2 rounded hover:bg-gray-50">
        📥 Download E-Ticket
      </button>
      <button className="border border-gray-300 px-4 py-2 rounded hover:bg-gray-50">
        📅 Add to Calendar
      </button>
    </div>

    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
      <div className="text-green-800 mb-2">
        🎉 Flight added to "Tokyo Trip"
      </div>
      <button className="text-green-600 hover:underline font-medium">
        View Full Itinerary →
      </button>
    </div>
  </div>
)
```

### 5.4 Mobile Responsive Design

**Breakpoints:**
```css
/* Mobile: <640px - Single column, bottom sheets */
@media (max-width: 640px) {
  .booking-layout { flex-direction: column; }
  .flight-search { position: fixed; bottom: 0; }
}

/* Tablet: 640-1024px - Two columns */
@media (min-width: 640px) and (max-width: 1024px) {
  .booking-layout { grid-template-columns: 1fr 1fr; }
}

/* Desktop: >1024px - Three columns (chat | search | details) */
@media (min-width: 1024px) {
  .booking-layout { grid-template-columns: 1fr 2fr 1fr; }
}
```

### 5.5 Animation & Micro-interactions

```typescript
// Framer Motion animations
const variants = {
  flightCard: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.2, ease: 'easeOut' }
  },

  confirmation: {
    initial: { scale: 0.8, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    transition: { duration: 0.4, ease: 'easeOut' }
  },

  priceUpdate: {
    animate: {
      backgroundColor: ['#fff', '#fef3c7', '#fff'],
      transition: { duration: 0.6 }
    }
  }
}

// Usage
<motion.div variants={variants.flightCard} initial="initial" animate="animate">
  <FlightResultCard flight={flight} />
</motion.div>
```

---

## 6. Implementation Phases

### Phase 7.1.1: Agent Routing & Booking Chat UI (Week 1-2)
**Goal:** Enable mode switching and basic booking chat interface

**Tasks:**
- [ ] Create `agentRouter.ts` with routing logic
- [ ] Add `BookingEngine` service class
- [ ] Implement `BookingModeIndicator` component
- [ ] Add booking state to `Home.tsx`
- [ ] Create booking chat UI (reuse existing chat component with mode prop)
- [ ] Test mode switching and context preservation

**Deliverable:** Users can trigger booking mode, chat shows booking context

---

### Phase 7.1.2: Duffel Integration & Flight Search (Week 3-4)
**Goal:** Search flights from multiple providers

**Tasks:**
- [ ] Set up Duffel API account and get API key
- [ ] Implement `DuffelProvider` class
- [ ] Create `FlightAggregator` with caching
- [ ] Add database tables (FlightSearch, FlightBooking, PriceAlert)
- [ ] Create `/api/booking/search` endpoint
- [ ] Implement `FlightSearchCard` component
- [ ] Implement `FlightResultCard` and `FlightResultsList`
- [ ] Add search result caching (15min TTL)

**Deliverable:** Users can search flights and see results

---

### Phase 7.1.3: Booking Flow & Passenger Forms (Week 5-6)
**Goal:** Collect passenger info and create bookings

**Tasks:**
- [ ] Design conversational passenger info flow
- [ ] Implement `PassengerForm` component
- [ ] Create `PassengerProfile` table and endpoints
- [ ] Add form validation (passport format, dates, etc.)
- [ ] Implement seat selection (if Duffel supports)
- [ ] Create `/api/booking/create` endpoint
- [ ] Build `FlightDetailsPanel` with baggage/meals
- [ ] Add booking preview screen

**Deliverable:** Users can select flight, enter passenger info, preview booking

---

### Phase 7.1.4: Payment Integration (Week 7-8)
**Goal:** Process payments via Stripe

**Tasks:**
- [ ] Extend Stripe service for flight bookings
- [ ] Create payment intent endpoint
- [ ] Implement `BookingSummary` component
- [ ] Add Stripe checkout integration
- [ ] Handle webhook for payment confirmation
- [ ] Create booking record in database
- [ ] Send confirmation email (reuse email service)
- [ ] Handle payment failures gracefully

**Deliverable:** Users can complete end-to-end booking with payment

---

### Phase 7.1.5: Confirmation & Itinerary Sync (Week 9)
**Goal:** Confirm booking and auto-add to trip

**Tasks:**
- [ ] Implement `BookingConfirmation` component
- [ ] Add "Add to Itinerary" logic
- [ ] Create booking confirmation email template
- [ ] Implement e-ticket download
- [ ] Add calendar export (.ics file)
- [ ] Create check-in reminder system
- [ ] Build booking history view

**Deliverable:** Confirmed bookings sync to itinerary, emails sent

---

### Phase 7.1.6: Price Alerts & Advanced Features (Week 10-11)
**Goal:** Price tracking and smart suggestions

**Tasks:**
- [ ] Implement price alert creation
- [ ] Create background job for price checking (node-cron)
- [ ] Send price drop emails
- [ ] Add flexible date calendar view
- [ ] Implement "Smart Bundling" suggestions (AI-powered)
- [ ] Create price history charts
- [ ] Add carbon footprint display

**Deliverable:** Users can track prices, get smart suggestions

---

### Phase 7.1.7: Testing & Polish (Week 12)
**Goal:** Production-ready quality

**Tasks:**
- [ ] End-to-end testing (Playwright)
- [ ] Error handling for all edge cases
- [ ] Performance optimization (caching, lazy loading)
- [ ] Mobile responsiveness testing
- [ ] Accessibility audit (WCAG AA)
- [ ] Load testing (100 concurrent bookings)
- [ ] Security audit (payment flow)
- [ ] Documentation updates

**Deliverable:** Production-ready flight booking system

---

## 7. Configuration & Setup

### 7.1 Environment Variables

```bash
# .env additions

# Duffel Flight API
DUFFEL_API_KEY=duffel_test_your-key-here
DUFFEL_WEBHOOK_SECRET=your-webhook-secret

# Kiwi.com (backup provider)
KIWI_API_KEY=your-kiwi-key

# Amadeus (future)
# AMADEUS_CLIENT_ID=your-client-id
# AMADEUS_CLIENT_SECRET=your-client-secret

# Flight booking settings
FLIGHT_SEARCH_CACHE_TTL=900000  # 15 minutes in ms
BOOKING_COMMISSION_PERCENT=2    # 2% commission
ENABLE_PRICE_ALERTS=true
```

### 7.2 API Provider Setup

**Duffel Setup:**
1. Sign up at https://duffel.com
2. Get API key from dashboard
3. Configure webhook URL: `https://yourdomain.com/api/webhooks/duffel`
4. Enable test mode for development

**Kiwi.com Setup:**
1. Sign up at https://tequila.kiwi.com/portal/
2. Get API key
3. Note: Kiwi specializes in budget airlines

---

## 8. Revenue Model

### 8.1 Commission Tracking

```typescript
// Calculate commission on each booking
function calculateCommission(basePrice: number, config: CommissionConfig): number {
  const percentCommission = basePrice * (config.commissionPercent / 100)
  const flatCommission = config.flatFee

  return Math.max(percentCommission, flatCommission)
}

// Example
const commission = calculateCommission(745, {
  commissionPercent: 2,  // 2%
  flatFee: 10            // Minimum $10
})
// Returns: $14.90 (2% of $745)
```

### 8.2 Pricing Strategy

**Option 1: Commission-Based** (Recommended)
- Earn 1-3% from Duffel/Kiwi per booking
- Transparent pricing (users see actual flight price)
- Revenue: ~$15-40 per domestic flight, $50-150 per international

**Option 2: Markup-Based**
- Add $5-15 to ticket price
- Higher margin but less transparent
- Risk: Users compare prices elsewhere

**Hybrid Approach:**
- Commission for Pro/Team subscribers
- Markup for Free users (incentive to upgrade)

---

## 9. Testing Strategy

### 9.1 Unit Tests

```typescript
// Example: Test flight search caching
describe('FlightAggregator', () => {
  it('should cache search results for 15 minutes', async () => {
    const criteria = { origin: 'JFK', destination: 'NRT', ... }

    const result1 = await aggregator.search(criteria)
    const result2 = await aggregator.search(criteria)

    expect(result1).toEqual(result2) // Same from cache
    expect(mockDuffel.search).toHaveBeenCalledTimes(1) // Only called once
  })

  it('should failover to Kiwi if Duffel fails', async () => {
    mockDuffel.search.mockRejectedValue(new Error('API down'))

    const result = await aggregator.search(criteria)

    expect(mockKiwi.search).toHaveBeenCalled()
    expect(result).toBeDefined()
  })
})
```

### 9.2 Integration Tests

```typescript
// Test full booking flow
describe('Booking Flow', () => {
  it('should complete end-to-end booking', async () => {
    // 1. Search flights
    const flights = await request(app)
      .post('/api/booking/search')
      .send({ origin: 'JFK', destination: 'NRT', ... })
      .expect(200)

    // 2. Select flight
    const flightId = flights.body[0].id

    // 3. Create booking
    const booking = await request(app)
      .post('/api/booking/create')
      .send({ flightId, passengers: [...], tripId: 'trip_123' })
      .expect(200)

    // 4. Verify booking in database
    const dbBooking = await prisma.flightBooking.findUnique({
      where: { id: booking.body.id }
    })
    expect(dbBooking).toBeDefined()

    // 5. Verify added to trip itinerary
    const trip = await prisma.trip.findUnique({ where: { id: 'trip_123' } })
    expect(trip.dataJson.days[0].items).toContainEqual(
      expect.objectContaining({ type: 'flight' })
    )
  })
})
```

### 9.3 E2E Tests (Playwright)

```typescript
test('User can book flight via chat', async ({ page }) => {
  await page.goto('/trip/123')

  // Trigger booking mode
  await page.fill('[data-testid="chat-input"]', 'Book flight to Tokyo')
  await page.click('[data-testid="send-button"]')

  // Verify booking mode activated
  await expect(page.locator('[data-testid="booking-mode-indicator"]')).toBeVisible()

  // Fill search form
  await page.fill('[data-testid="search-origin"]', 'JFK')
  await page.fill('[data-testid="search-destination"]', 'NRT')
  await page.click('[data-testid="search-button"]')

  // Select flight
  await page.click('[data-testid="flight-card"]:first-child >> button:has-text("Select")')

  // Fill passenger info
  await page.fill('[data-testid="passenger-first-name"]', 'John')
  await page.fill('[data-testid="passenger-last-name"]', 'Doe')
  // ... more fields

  // Complete payment (use Stripe test mode)
  await page.fill('[data-testid="card-number"]', '4242424242424242')
  await page.click('[data-testid="pay-button"]')

  // Verify confirmation
  await expect(page.locator('text=Booking Confirmed')).toBeVisible()
  await expect(page.locator('[data-testid="pnr"]')).toContainText(/[A-Z0-9]{6}/)
})
```

---

## 10. Security Considerations

### 10.1 Payment Security
- All payments via Stripe (PCI compliant)
- Never store credit card details
- Use Stripe Payment Intents (3D Secure support)
- Validate amounts server-side (prevent tampering)

### 10.2 Data Protection
- Encrypt passport numbers at rest
- Hash passenger data (GDPR compliance)
- Minimal data retention (delete after trip completion)
- Secure webhook signature validation

### 10.3 Fraud Prevention
- Rate limiting on booking creation (max 5/hour)
- Verify email before high-value bookings
- Flag suspicious patterns (rapid bookings, IP mismatches)
- Stripe Radar for fraud detection

---

## 11. Monitoring & Analytics

### 11.1 Key Metrics

**Business Metrics:**
- Booking conversion rate (searches → bookings)
- Average booking value
- Commission revenue per booking
- Cancellation rate

**Technical Metrics:**
- API response times (p50, p95, p99)
- Search cache hit rate
- Payment success rate
- Error rate by provider

### 11.2 Logging

```typescript
// Structured logging for bookings
logger.info('flight_booking_created', {
  booking_id: booking.id,
  user_id: user.id,
  provider: 'duffel',
  route: `${booking.origin}-${booking.destination}`,
  price: booking.totalPrice,
  commission: booking.commission,
  duration_ms: Date.now() - startTime
})
```

### 11.3 Alerts

- Payment failure rate > 5% → Slack alert
- Provider API down → Switch to backup, notify team
- Search latency > 5s → Investigate caching
- Booking cancellation spike → Check for issues

---

## 12. Future Enhancements (Post-MVP)

### 12.1 Multi-Provider Support
- Add Amadeus, Google Flights (if available)
- Intelligent provider selection based on route
- Meta-search across all providers

### 12.2 Advanced Features
- Hotel bundling (flights + hotels)
- Car rental integration
- Travel insurance upsell
- Loyalty program integration
- Group bookings (10+ passengers)

### 12.3 AI Innovations
- Predictive pricing (ML model for "best time to book")
- Natural language seat selection ("window seat near front")
- Smart rebooking (auto-rebook if price drops)
- Voice booking via assistant

---

## 13. Success Criteria

**Phase 7.1 is complete when:**
- ✅ Users can search flights via chat or form
- ✅ Multi-provider support (Duffel + backup)
- ✅ Complete booking flow (search → passenger → payment → confirm)
- ✅ Payments processed via Stripe
- ✅ Bookings auto-sync to trip itinerary
- ✅ Confirmation emails sent
- ✅ Price alerts functional
- ✅ Mobile-responsive UI
- ✅ <2s search response time
- ✅ >80% booking completion rate (users who start → finish)
- ✅ Zero payment security issues

**Target Metrics (First Month):**
- 50+ flight searches
- 10+ completed bookings
- $500+ commission revenue
- 4.5+ star user satisfaction

---

## 14. Team & Resources

**Required Roles:**
- Backend Engineer (flight API integration, booking flow)
- Frontend Engineer (UI components, chat integration)
- Designer (UX flows, component design)
- QA Engineer (testing strategy, automation)
- DevOps (deployment, monitoring)

**Estimated Effort:** 12 weeks (3 months)

**Dependencies:**
- Duffel API access (apply 1-2 weeks ahead)
- Stripe live mode approval (may require business verification)
- Legal review of booking terms & conditions

---

## Appendix

### A. API Provider Comparison

| Provider | Pros | Cons | Pricing |
|----------|------|------|---------|
| **Duffel** | Modern API, great docs, easy integration | Limited airline coverage vs GDS | 1-3% commission |
| **Kiwi.com** | Budget airlines, good prices | Complex API, less reliable | 2-5% commission |
| **Amadeus** | Comprehensive (GDS), enterprise-grade | Complex setup, expensive | Quote-based |
| **Google Flights** | Best UX, accurate prices | No public API (partnership only) | N/A |

### B. Conversation Flow Examples

**Example 1: Quick Booking**
```
User: Book flight to Tokyo next week under $800
AI: [Shows search card pre-filled]
    Found 3 flights under $800. Best option: United UA 79 for $745
    [Flight card with "Select" button]
User: Book the United flight
AI: Great choice! I need passenger details.
    What's your full name (as on passport)?
User: John Doe
AI: Date of birth?
User: 01/15/1990
AI: [Shows booking summary]
    Ready to pay $881 (including taxes)?
User: Yes
AI: [Stripe checkout]
    ✅ Confirmed! PNR: ABC123. Added to your Tokyo trip.
```

**Example 2: Flexible Dates**
```
User: Cheapest flight to Paris in March
AI: [Shows calendar with prices by date]
    Cheapest: March 19 for $412 (Tue-Tue)
    Save $200 vs flying weekends!
User: Show me March 19 flights
AI: [Shows results]
    ...
```

### C. Database Schema Diagram

```
┌─────────────┐
│    User     │
└──────┬──────┘
       │
       ├──────────────┬────────────────┬─────────────────┐
       │              │                │                 │
┌──────▼──────┐ ┌────▼─────────┐ ┌────▼──────────┐ ┌────▼─────────────┐
│    Trip     │ │ FlightSearch │ │ FlightBooking │ │  PriceAlert      │
└─────────────┘ └──────────────┘ └───────────────┘ └──────────────────┘
       │                                  │
       └──────────────────────────────────┘
              (auto-add booking to trip)
```

---

**Document Version:** 1.0
**Last Updated:** 2024-01-XX
**Owner:** OtterlyGo Engineering Team
