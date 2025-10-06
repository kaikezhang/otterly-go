# 🦦 OtterlyGo

A conversational, content-rich travel planner that helps you co-create realistic day-by-day itineraries through natural conversation.

## What It Does

OtterlyGo is a production-ready travel planner with:
- **Google OAuth Authentication**: Sign in securely with your Google account
- **Conversational AI Planning**: Answer guided questions with quick reply buttons to co-create realistic itineraries
- **Interactive Maps**: Visualize your trip with Mapbox - auto-geocoded markers, route polylines, and distance calculations
- **Direct Editing**: Drag-and-drop to reorder activities, inline edit text, and undo/redo changes
- **Visual Content**: Beautiful Unsplash photos for destinations and activities
- **Public Sharing**: Share trips via secure public links (no login required for viewers)
- **Database Persistence**: All trips auto-save to PostgreSQL with real-time sync
- **Secure Backend**: API keys protected server-side, rate limiting, and JWT authentication

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL database (local or hosted)
- OpenAI API key ([get one here](https://platform.openai.com/api-keys))
- Google OAuth credentials ([setup guide](https://console.cloud.google.com))
- Mapbox access token ([get one here](https://account.mapbox.com))
- Unsplash API key ([get one here](https://unsplash.com/developers))

### Installation

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.example .env

# 3. Edit .env and add your OpenAI API key
# OPENAI_API_KEY=sk-...

# 4. Start both frontend and backend servers
npm run dev
```

This will start:
- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:3001

### Environment Configuration

Edit `.env` and configure:

```bash
# Database (Required)
DATABASE_URL=postgresql://user:password@localhost:5432/otterly_go

# OpenAI API (Required)
OPENAI_API_KEY=sk-your-key-here
OPENAI_MODEL=gpt-4o-mini  # or gpt-3.5-turbo

# Google OAuth (Required)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-secret
GOOGLE_CALLBACK_URL=http://localhost:3001/api/auth/google/callback

# JWT Authentication (Required)
JWT_SECRET=your-random-secret-key

# Mapbox Maps (Required)
MAPBOX_ACCESS_TOKEN=pk.your-token-here
VITE_MAPBOX_ACCESS_TOKEN=pk.your-token-here

# Unsplash Photos (Required)
UNSPLASH_ACCESS_KEY=your-access-key

# Server Config (Optional)
PORT=3001
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

**Database Setup**: See [DATABASE_SETUP.md](./DATABASE_SETUP.md) for detailed PostgreSQL setup instructions.

**Troubleshooting API Key Issues:**
- Make sure your API key starts with `sk-proj-` or `sk-`
- Check that your API key has credits at [platform.openai.com/account/billing](https://platform.openai.com/account/billing)
- Check backend console for detailed error messages
- If you get a 401 error, your API key is invalid
- If you get a 429 error, you've hit the rate limit (backend enforces 20 req/min)
- If you get a 402 error, add credits to your OpenAI account

**Test the backend:**
```bash
# Check if backend is running
curl http://localhost:3001/health
```

## How to Use

### Getting Started

1. **Sign in with Google**: Click "Sign in with Google" on the landing page
2. **Start planning**: Click "New Trip" to begin a conversation
3. **Answer guided questions**: Use quick reply buttons or type your own responses
4. **Review your itinerary**: See your day-by-day plan with interactive map
5. **Edit and customize**: Drag-and-drop activities, edit inline, or ask the AI for changes
6. **Share your trip**: Click "Share" to get a public link for friends/family

### Key Features

#### 🗣️ Conversational Planning
- Answer quick reply questions to guide the AI
- The assistant asks one question at a time with suggested answers
- Can type custom responses anytime

#### 🗺️ Interactive Maps
- All activities auto-geocoded and shown on Mapbox
- Color-coded markers by day with route polylines
- Click markers for activity details
- Distance and duration calculations

#### ✏️ Direct Editing
- Toggle "Edit Mode" to enable inline editing
- Drag-and-drop activities within or between days
- Double-click to edit titles and descriptions
- Add time pickers for scheduling
- Undo/redo with Ctrl+Z / Ctrl+Y

#### 📸 Visual Content
- Auto-fetched Unsplash photos for destinations
- High-quality images in suggestion cards
- Proper photographer attribution

#### 🔗 Public Sharing
- Generate shareable links (no login required for viewers)
- Track view counts
- Revoke access anytime
- Mobile-responsive shared trip view

## Architecture & Rationale

### Why These Choices?

**Frontend Stack**
- **React + TypeScript + Vite**: Fast, modern, type-safe development with instant HMR
- **Tailwind CSS v4**: Utility-first styling for rapid UI development
- **Zustand + persist middleware**: Lightweight state management (~3KB) with built-in localStorage persistence

**Backend** ✅
- **Express.js + TypeScript**: Secure API proxy for OpenAI requests
- **PostgreSQL + Prisma ORM**: Database persistence with connection pooling
- **Google OAuth + JWT**: Secure authentication with session management
- **Rate limiting**: 20 requests/minute per IP address
- **Request validation**: Zod schemas for type-safe API contracts
- **Mapbox Integration**: Geocoding and routing APIs with caching
- **Unsplash Integration**: Photo search API with smart caching
- **Share Links**: Public trip sharing with view tracking

**Conversation Design**
- **Quick reply buttons**: LLM generates contextual candidate answers for guided conversation
- **One question at a time**: Focused questioning prevents overwhelming users
- **Structured JSON responses**: LLM returns typed JSON for itineraries/suggestions/quick replies
- **Local guide persona**: Engaging, knowledgeable tone with destination-specific insights
- **Stateful conversation**: Full message history sent to maintain context across exchanges

**Data Model**
- **Flat day structure**: Days contain items directly (no sub-nesting), keeping updates simple
- **Location-aware items**: Activities include optional lat/lng/address for map visualization
- **Immutable updates**: Zustand uses spreading to ensure React re-renders correctly
- **Rich suggestion cards**: Embedded in chat messages with Unsplash photos and attribution
- **Undo/redo stack**: Last 20 editing actions tracked for user-friendly editing

### Project Structure

```
src/                     # Frontend (React + TypeScript)
├── types/               # TypeScript interfaces (Trip, Day, ItineraryItem, etc.)
├── store/               # Zustand store with undo/redo and persistence
├── services/            # API clients (chat, trips, map, photos)
├── components/          # React components
│   ├── Chat.tsx         # Chat interface with quick replies
│   ├── ItineraryView.tsx # Itinerary with drag-and-drop
│   ├── MapView.tsx      # Interactive Mapbox map
│   ├── ShareButton.tsx  # Public share functionality
│   └── ...
├── pages/               # Page components (Home, Login, Profile, SharedTrip)
├── App.tsx              # Router and main app orchestration
└── main.tsx             # React entry point

server/                  # Backend (Express + TypeScript)
├── index.ts             # Express app with CORS, Passport, JWT
├── config/
│   └── passport.ts      # Google OAuth strategy
├── routes/
│   ├── auth.ts          # Google OAuth endpoints
│   ├── chat.ts          # POST /api/chat - OpenAI proxy
│   ├── trips.ts         # Trip CRUD + share management
│   ├── map.ts           # Geocoding & directions
│   ├── photos.ts        # Unsplash photo search
│   ├── share.ts         # Public share access
│   └── user.ts          # User profile management
├── middleware/
│   ├── auth.ts          # JWT verification
│   ├── rateLimit.ts     # Rate limiting (20 req/min)
│   └── validation.ts    # Zod request schemas
└── db.ts                # Prisma client singleton
```

### Key Design Patterns

1. **Separation of concerns**: Chat UI doesn't know about itinerary logic; App orchestrates
2. **Optimistic updates**: Add/remove items update state immediately (no async wait)
3. **Undo/redo architecture**: Immutable snapshots enable time-travel debugging
4. **Auto-geocoding pipeline**: LLM provides locationHint → Mapbox geocodes → cached results
5. **JWT + httpOnly cookies**: Secure authentication without localStorage exposure
6. **Smart caching**: In-memory + database caching for geocoding and photos (7-day TTL)
7. **Graceful degradation**: Errors show banner but don't break the experience
8. **Accessibility**: ARIA labels, keyboard navigation, drag-and-drop keyboard support

## Content Approach

The conversation engine instructs the LLM to:
- Include 2-3 images per suggestion (using Unsplash-style URLs as placeholders)
- Provide 2-3 sentence summaries of "why it's popular/what to expect"
- Include 1-2 traveler quotes with both Chinese original and English translation
- Link to 1-3 sources (e.g., Xiaohongshu note URLs)

**For MVP**: Content is LLM-generated based on its training data. Production would integrate real APIs (Xiaohongshu, Google Places, etc.) for verified images/quotes/links.

## Completed Features

### ✅ Phase 1: Backend Foundation (2025-10-06)
- **Milestone 1.1**: Backend API proxy with rate limiting and validation
- **Milestone 1.2**: PostgreSQL + Prisma ORM database setup
- **Milestone 1.3**: Full Trip CRUD API with auto-save and pagination

### ✅ Phase 2: Authentication & User Management (2025-10-06)
- **Milestone 2.1**: Google OAuth authentication with JWT
- **Milestone 2.2**: Frontend auth integration with protected routes
- **Milestone 2.3**: User profile and settings management
- **Milestone 2.4**: Quick reply buttons for guided conversation UX

### ✅ Phase 3: Enhanced Features (2025-10-06)
- **Milestone 3.1**: Interactive Mapbox maps with auto-geocoding and route polylines
- **Milestone 3.2**: Direct editing with drag-and-drop and undo/redo
- **Milestone 3.3**: Unsplash photo library integration with smart caching
- **Milestone 3.4**: Public share links with view tracking

**See Detailed Documentation**:
- [MILESTONE_1.1_SUMMARY.md](./MILESTONE_1.1_SUMMARY.md) - API Proxy & Security
- [MILESTONE_1.2_SUMMARY.md](./MILESTONE_1.2_SUMMARY.md) - Database Setup
- [MILESTONE_1.3_SUMMARY.md](./MILESTONE_1.3_SUMMARY.md) - Trip CRUD API
- [MILESTONE_3.1_SUMMARY.md](./MILESTONE_3.1_SUMMARY.md) - Map Integration
- [MILESTONE_3.4_SUMMARY.md](./MILESTONE_3.4_SUMMARY.md) - Public Sharing
- [DEVELOPMENT.md](./DEVELOPMENT.md) - Full Development Roadmap

## Future Enhancements

**Deferred to Future Phases**:
- Actual bookings or reservations integration
- Budget tracking and expense splitting
- Offline mode with cached map tiles
- Real-time collaborative editing
- Advanced route optimization (travel time vs interest)
- Xiaohongshu / TripAdvisor content scraping
- Multi-language support (i18n)
- Mobile native apps (React Native)
- AI-powered budget optimization
- Weather integration and seasonal recommendations

## Testing

### Manual Testing Flow
1. **Sign in**: Use Google OAuth to authenticate
2. **Start planning**: Begin conversation with quick reply buttons
3. **Generate itinerary**: Answer 5-6 guided questions
4. **View map**: See all activities geocoded on interactive Mapbox
5. **Edit directly**: Toggle edit mode, drag-and-drop activities, inline edit text
6. **Test undo/redo**: Use Ctrl+Z / Ctrl+Y to navigate edit history
7. **Share trip**: Generate public link, open in incognito to verify
8. **Mobile responsive**: Test all features on mobile (tab navigation)

### API Testing
```bash
# Health checks
curl http://localhost:3001/health
curl http://localhost:3001/health/db

# Test geocoding
curl http://localhost:3001/api/map/geocode?query=Machu%20Picchu

# Test photo search
curl http://localhost:3001/api/photos/search?query=Peru&limit=3
```

**Automated tests** (future): Vitest + React Testing Library for component tests, Playwright for E2E testing.

## Build & Deploy

```bash
# Production build
npm run build

# Preview production build
npm run preview

# Deploy to Vercel/Netlify/etc
# Upload the `dist/` folder
```

## Development Roadmap

This project has completed **3 full development phases** (12 milestones):

### ✅ Phase 1: Backend Foundation
- ✅ Milestone 1.1: Backend API Proxy ([details](./MILESTONE_1.1_SUMMARY.md))
- ✅ Milestone 1.2: PostgreSQL Database ([details](./MILESTONE_1.2_SUMMARY.md))
- ✅ Milestone 1.3: Trip CRUD API ([details](./MILESTONE_1.3_SUMMARY.md))

### ✅ Phase 2: Authentication & User Management
- ✅ Milestone 2.1: Google OAuth + JWT
- ✅ Milestone 2.2: Frontend Auth Integration
- ✅ Milestone 2.3: User Profile & Settings
- ✅ Milestone 2.4: Quick Reply UX Enhancement

### ✅ Phase 3: Enhanced Features
- ✅ Milestone 3.1: Map Integration ([details](./MILESTONE_3.1_SUMMARY.md))
- ✅ Milestone 3.2: Direct Editing & Drag-and-Drop
- ✅ Milestone 3.3: Unsplash Photo Library
- ✅ Milestone 3.4: Public Share Links ([details](./MILESTONE_3.4_SUMMARY.md))

### 🚧 Next: Phase 4 (Optimization & Polish)
- Payment integration (Stripe)
- Performance monitoring (Sentry)
- SEO optimization
- Email notifications
- Mobile app (React Native)

See [DEVELOPMENT.md](./DEVELOPMENT.md) for the complete roadmap.

## Development

```bash
# Run frontend and backend together
npm run dev

# Run frontend only
npm run dev:client

# Run backend only
npm run dev:server

# Build for production
npm run build
npm run build:server
```

## License

MIT

---

**OtterlyGo** - Production-ready AI travel planner ✅
- **Phase 1**: Secure backend with PostgreSQL database ✅
- **Phase 2**: Google OAuth authentication & quick reply UX ✅
- **Phase 3**: Interactive maps, direct editing, photos & sharing ✅
- **Next**: Payment integration & mobile apps 🚧
