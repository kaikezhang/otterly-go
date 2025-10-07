# 🦦 OtterlyGo

A conversational, content-rich travel planner that helps you co-create realistic day-by-day itineraries through natural conversation.

## What It Does

OtterlyGo is an advanced AI-powered travel planner with:

**✨ Core Features:**
- **Conversational AI Planning**: GPT-powered trip generation with guided quick-reply questions
- **Interactive Maps**: Mapbox integration with auto-geocoding, route polylines, and distance calculations
- **Direct Editing**: Drag-and-drop itinerary management with undo/redo support
- **Visual Content**: Unsplash photo integration with smart caching
- **Multi-Platform Content**: Travel inspiration from Xiaohongshu and Reddit with intelligent filtering

**🔐 Authentication & User Management:**
- **Google OAuth + JWT**: Secure authentication with session management
- **Email/Password Auth**: Alternative login method with password reset
- **User Profiles**: Customizable profiles with preferences and settings

**💳 Monetization & Management:**
- **Stripe Subscriptions**: Free, Pro, and Team tiers with usage tracking
- **Usage Limits**: API usage monitoring and soft/hard limits
- **Admin Dashboard**: User management, analytics, and system monitoring

**📧 Communication & Integration:**
- **Email Notifications**: Welcome emails, trip confirmations, reminders, and alerts (Resend)
- **Email Import**: Auto-parse booking confirmations from Gmail/Outlook
- **Smart Parsing**: GPT-powered extraction of flight, hotel, and activity bookings

**🗺️ Trip Management:**
- **Public Sharing**: Shareable links with view tracking and optional password protection
- **Trip Status Workflow**: Draft → Planning → Upcoming → Active → Completed → Archived
- **Tags & Filtering**: Organize trips with custom tags and advanced filters
- **Database Persistence**: Auto-save to PostgreSQL with real-time sync

## Quick Start

### Prerequisites

**Required:**
- Node.js 18+ and npm
- PostgreSQL database (local or hosted - see [DATABASE_SETUP.md](./DATABASE_SETUP.md))
- OpenAI API key ([get one here](https://platform.openai.com/api-keys))
- Google OAuth credentials ([setup guide](https://console.cloud.google.com))
- Mapbox access token ([get one here](https://account.mapbox.com))
- Unsplash API key ([get one here](https://unsplash.com/developers))

**Optional (for advanced features):**
- Stripe API keys for subscription system ([get keys](https://dashboard.stripe.com/apikeys))
- Resend API key for email notifications ([get key](https://resend.com/api-keys))
- Microsoft OAuth credentials for Outlook email import ([Azure Portal](https://portal.azure.com))
- Google API credentials for Gmail import ([Google Cloud Console](https://console.cloud.google.com))

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

Edit `.env` and configure the following variables. See [.env.example](./.env.example) for complete documentation.

**Required (Core Features):**
```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/otterly_go

# OpenAI API
OPENAI_API_KEY=sk-your-key-here
OPENAI_MODEL=gpt-4o-mini  # or gpt-3.5-turbo

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-secret
GOOGLE_CALLBACK_URL=http://localhost:3001/api/auth/google/callback

# JWT Authentication
JWT_SECRET=your-random-secret-key

# Mapbox Maps
MAPBOX_ACCESS_TOKEN=pk.your-token-here
VITE_MAPBOX_ACCESS_TOKEN=pk.your-token-here

# Unsplash Photos
UNSPLASH_ACCESS_KEY=your-access-key
```

**Optional (Advanced Features):**
```bash
# Stripe Subscriptions (for monetization)
STRIPE_SECRET_KEY=sk_test_your-key
STRIPE_PUBLISHABLE_KEY=pk_test_your-key
STRIPE_WEBHOOK_SECRET=whsec_your-secret
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your-key

# Email Notifications (Resend)
RESEND_API_KEY=re_your-key
EMAIL_FROM=OtterlyGo <notifications@yourdo main.com>

# Email Import - Gmail
GOOGLE_CLIENT_ID=your-oauth-client-id
GOOGLE_CLIENT_SECRET=your-oauth-secret

# Email Import - Outlook
MICROSOFT_CLIENT_ID=your-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-secret

# Multi-Platform Content (optional)
ENABLE_XIAOHONGSHU=false  # Set to true to enable Xiaohongshu integration
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
- GPT-powered natural language trip generation
- Quick reply buttons with suggested answers
- Multi-platform content integration (Xiaohongshu, Reddit)
- Activity-centric suggestions with intelligent filtering

#### 🗺️ Interactive Maps
- Auto-geocoding with Mapbox API (cached for performance)
- Color-coded markers by day with route polylines
- Distance and duration calculations
- Click markers for activity details

#### ✏️ Direct Editing
- Drag-and-drop activities within or between days
- Inline text editing with auto-save
- Time pickers for precise scheduling
- Undo/redo with Ctrl+Z / Ctrl+Y
- Trip status workflow (Draft → Planning → Active → Completed → Archived)

#### 📸 Visual Content
- Unsplash photo integration with smart caching
- High-quality images in suggestion cards
- Photographer attribution and source links

#### 🔗 Sharing & Collaboration
- Public shareable links with optional password protection
- View count tracking
- Revoke access anytime
- Mobile-responsive shared trip view

#### 💳 Subscription System
- Free tier: Limited trips and basic features
- Pro tier: Unlimited trips, GPT-4o, advanced features
- Team tier: Shared workspaces and collaboration tools
- Usage tracking and soft/hard limits

#### 📧 Email Integration
- Auto-import booking confirmations from Gmail/Outlook
- GPT-powered parsing of flights, hotels, activities
- Conflict detection for overlapping bookings
- Email notifications for trip events and reminders

#### 👤 User Management
- Google OAuth authentication
- Email/password auth with password reset
- Customizable profiles and preferences
- Email notification preferences
- Admin dashboard for user management

## Architecture & Rationale

### Why These Choices?

**Frontend Stack**
- **React + TypeScript + Vite**: Fast, modern, type-safe development with instant HMR
- **Tailwind CSS v4**: Utility-first styling for rapid UI development
- **Zustand + persist middleware**: Lightweight state management (~3KB) with built-in localStorage persistence

**Backend** ✅
- **Express.js + TypeScript**: Secure API proxy for OpenAI requests
- **PostgreSQL + Prisma ORM**: Database persistence with connection pooling
- **Authentication**: Google OAuth + JWT, email/password with bcrypt
- **Stripe Integration**: Subscription management with webhooks
- **Email Services**: Resend for transactional emails and notifications
- **Email Import**: Gmail/Outlook OAuth integration with GPT parsing
- **Rate Limiting**: Per-IP and per-user limits with Redis (optional)
- **Usage Tracking**: API usage monitoring and cost calculation
- **Admin System**: Admin dashboard with user management and analytics
- **Mapbox Integration**: Geocoding and routing APIs with database caching
- **Unsplash Integration**: Photo search API with smart caching
- **Content Aggregation**: Multi-platform social content (Xiaohongshu, Reddit)
- **Scheduled Jobs**: Node-cron for email reminders and cleanup tasks
- **Request Validation**: Zod schemas for type-safe API contracts
- **Security**: Helmet, CORS, rate limiting, input sanitization
- **Logging**: Pino structured logging with pretty-print

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
├── index.ts             # Express app with CORS, Passport, JWT, logging
├── config/
│   └── passport.ts      # Google OAuth strategy
├── routes/
│   ├── auth.ts          # Google OAuth + email/password auth
│   ├── chat.ts          # POST /api/chat - OpenAI proxy
│   ├── trips.ts         # Trip CRUD + share management
│   ├── map.ts           # Mapbox geocoding & directions
│   ├── photos.ts        # Unsplash photo search
│   ├── share.ts         # Public share access
│   ├── user.ts          # User profile management
│   ├── subscriptions.ts # Stripe subscription management
│   ├── webhooks.ts      # Stripe webhooks
│   ├── admin.ts         # Admin dashboard and analytics
│   ├── email.ts         # Email notification preferences
│   ├── emailImport.ts   # Gmail/Outlook OAuth and parsing
│   ├── content.ts       # Multi-platform content aggregation
│   ├── xiaohongshu.ts   # Xiaohongshu integration (deprecated)
│   └── health.ts        # Health check endpoints
├── middleware/
│   ├── auth.ts          # JWT verification
│   ├── adminAuth.ts     # Admin role verification
│   ├── rateLimit.ts     # Rate limiting
│   ├── usageLimits.ts   # Subscription tier limits
│   └── validation.ts    # Zod request schemas
├── services/
│   ├── stripe.ts        # Stripe API client
│   ├── emailService.ts  # Resend email sending
│   ├── emailTemplates.ts# Email HTML templates
│   ├── emailParser.ts   # GPT-powered booking extraction
│   ├── gmailService.ts  # Gmail API client
│   ├── outlookService.ts# Outlook API client
│   ├── autoInsert.ts    # Auto-add bookings to trips
│   └── content/
│       ├── aggregator.ts      # Multi-platform aggregator
│       ├── base.ts            # Base content provider
│       └── providers/
│           ├── reddit.ts      # Reddit content provider
│           └── xiaohongshu.ts # Xiaohongshu provider
├── jobs/
│   └── emailJobs.ts     # Scheduled email tasks (node-cron)
├── utils/
│   ├── logger.ts        # Pino logger configuration
│   └── costCalculation.ts # API usage cost tracking
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

The conversation engine provides rich, multi-source travel content:

**Visual Content:**
- Unsplash photo integration with smart database caching
- High-quality images with photographer attribution
- Activity-specific photo suggestions

**Social Content Integration:**
- **Xiaohongshu (小红书)**: Real user-generated travel content with GPT translation
- **Reddit**: Travel subreddit discussions and recommendations
- Intelligent filtering based on destination and activity type
- Engagement metrics (likes, comments, shares) for quality ranking

**AI-Generated Content:**
- LLM-powered activity suggestions with contextual descriptions
- "Why it's popular" summaries and traveler insights
- Activity timing and logistics recommendations

**Future Integrations:**
- Google Places API for real-time ratings and reviews
- TripAdvisor for verified traveler reviews
- Instagram for trending travel spots

## Completed Features

### ✅ Phase 1: Backend Foundation
- **Milestone 1.1**: Backend API proxy with rate limiting and validation
- **Milestone 1.2**: PostgreSQL + Prisma ORM database setup
- **Milestone 1.3**: Full Trip CRUD API with auto-save and pagination

### ✅ Phase 2: Authentication & User Management
- **Milestone 2.1**: Google OAuth authentication with JWT
- **Milestone 2.2**: Frontend auth integration with protected routes
- **Milestone 2.3**: User profile and settings management
- **Milestone 2.4**: Quick reply buttons for guided conversation UX

### ✅ Phase 3: Enhanced Features
- **Milestone 3.1**: Interactive Mapbox maps with auto-geocoding and route polylines
- **Milestone 3.2**: Direct editing with drag-and-drop and undo/redo
- **Milestone 3.3**: Unsplash photo library integration with smart caching
- **Milestone 3.4**: Public share links with view tracking
- **Milestone 3.5**: Trip status management (Draft → Planning → Upcoming → Active → Completed → Archived)

### ✅ Phase 4: Production Readiness & Monetization
- **Milestone 4.1**: Stripe subscription system (Free, Pro, Team tiers)
- **Milestone 4.2**: API usage tracking and cost monitoring
- **Milestone 4.3**: Email notification system with Resend
- **Milestone 4.4**: Admin dashboard with user management and analytics

### ✅ Phase 5: Advanced Integrations
- **Milestone 5.1**: Email import from Gmail/Outlook with GPT-powered parsing
- **Milestone 5.2**: Multi-platform content aggregation (Xiaohongshu, Reddit)
- **Milestone 5.3**: Scheduled email jobs (trip reminders, notifications)
- **Milestone 5.4**: Password reset and email/password authentication

**See Detailed Documentation**:
- [ROADMAP.md](./ROADMAP.md) - Complete product roadmap and future plans
- [DATABASE_SETUP.md](./DATABASE_SETUP.md) - PostgreSQL setup guide
- Legacy milestone docs available for Phases 1-3

## Future Enhancements

**Phase 6: Collaboration & Social** (Next Priority):
- Real-time collaborative editing with WebSockets
- Multi-user trip planning with live cursors
- Voting and commenting on activities
- Social trip discovery platform
- Community Q&A and local experts

**Phase 7: Booking Integration**:
- Flight search and booking (Duffel, Kiwi.com)
- Hotel and accommodation booking (Booking.com, Airbnb)
- Activity and experience booking (Viator, GetYourGuide)
- Restaurant reservations (OpenTable, Resy)
- Transportation and car rentals

**Phase 8: Mobile & Offline**:
- React Native mobile apps (iOS/Android)
- Offline mode with cached map tiles
- Push notifications for trip reminders
- Location-aware features and navigation

**Phase 9: Advanced Intelligence**:
- Real-time context adaptation (weather, delays, traffic)
- Intelligent route optimization
- Predictive trip assistant
- Voice and multimodal interaction
- Budget tracking and expense splitting

**Phase 10: Enterprise**:
- Team workspaces and admin controls
- Corporate travel management
- Compliance and approval workflows
- Multi-language support (i18n)

See [ROADMAP.md](./ROADMAP.md) for the complete product roadmap.

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

This project has completed **5 development phases** (20+ milestones):

### ✅ Phase 1: Backend Foundation
- ✅ Milestone 1.1: Backend API Proxy
- ✅ Milestone 1.2: PostgreSQL Database
- ✅ Milestone 1.3: Trip CRUD API

### ✅ Phase 2: Authentication & User Management
- ✅ Milestone 2.1: Google OAuth + JWT
- ✅ Milestone 2.2: Frontend Auth Integration
- ✅ Milestone 2.3: User Profile & Settings
- ✅ Milestone 2.4: Quick Reply UX Enhancement

### ✅ Phase 3: Enhanced Features
- ✅ Milestone 3.1: Map Integration
- ✅ Milestone 3.2: Direct Editing & Drag-and-Drop
- ✅ Milestone 3.3: Unsplash Photo Library
- ✅ Milestone 3.4: Public Share Links
- ✅ Milestone 3.5: Trip Status Management

### ✅ Phase 4: Production Readiness & Monetization
- ✅ Milestone 4.1: Stripe Subscription System
- ✅ Milestone 4.2: API Usage Tracking
- ✅ Milestone 4.3: Email Notification System
- ✅ Milestone 4.4: Admin Dashboard

### ✅ Phase 5: Advanced Integrations (Partial)
- ✅ Milestone 5.1: Email Import from Gmail/Outlook
- ✅ Milestone 5.2: Multi-Platform Content (Xiaohongshu, Reddit)
- ✅ Milestone 5.3: Scheduled Email Jobs
- ✅ Milestone 5.4: Password Reset & Email Auth

### 🚧 Next: Phase 6 (Collaboration & Social)
- Real-time collaborative editing
- Social trip discovery
- Community features
- Influencer tools

See [ROADMAP.md](./ROADMAP.md) for the complete product roadmap and future plans.

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

**OtterlyGo** - Advanced AI travel planner with production-ready features ✅
- **Phases 1-3**: Core features (maps, auth, editing, sharing) ✅
- **Phase 4**: Monetization (Stripe subscriptions, usage tracking, admin) ✅
- **Phase 5**: Advanced integrations (email import, multi-platform content) ✅
- **Next**: Real-time collaboration & social features 🚧
