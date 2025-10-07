# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Install dependencies
npm install

# Start dev servers (frontend on :5173, backend on :3001)
npm run dev

# Start frontend only
npm run dev:client

# Start backend only
npm run dev:server

# Build for production (TypeScript check + Vite build)
npm run build

# Build backend
npm run build:server

# Preview production build
npm run preview

# Lint code
npm run lint
```

## Configuration

### Required Configuration

**Core API Keys** (required for basic functionality):

1. Copy `.env.example` to `.env`
2. Configure the following required keys:

```bash
# OpenAI API (for AI trip generation)
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini  # or gpt-3.5-turbo

# Google OAuth (for user authentication)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3001/api/auth/google/callback

# JWT Secret (for session tokens)
JWT_SECRET=your-random-secret-key

# Mapbox (for maps)
MAPBOX_ACCESS_TOKEN=pk.your-token-here
VITE_MAPBOX_ACCESS_TOKEN=pk.your-token-here

# Unsplash (for photos)
UNSPLASH_ACCESS_KEY=your-access-key
```

**Security Note**: All API keys are stored server-side only. The frontend never handles sensitive keys.

### Database Setup (Milestone 1.2)

The app uses **PostgreSQL** with **Prisma ORM** for data persistence:

1. Set up a PostgreSQL database (local or hosted)
2. Add `DATABASE_URL` to `.env` (see `.env.example` for format)
3. Run migrations: `npx prisma migrate deploy`
4. Verify connection: `curl http://localhost:3001/health/db`

**For detailed setup instructions**, see [DATABASE_SETUP.md](./DATABASE_SETUP.md)

**Schema**: See `prisma/schema.prisma` for complete schema. Key tables:
- `users` - User accounts (email, Google OAuth, Stripe customer info, subscription tier, preferences)
- `trips` - Trip itineraries (user_id, title, destination, dates, data_json, status, sharing, tags)
- `conversations` - Chat history for trips (trip_id, messages_json)
- `photo_library` - Cached Unsplash photos (source, URLs, attribution, usage tracking)
- `trip_photos` - Links photos to trips and itinerary items
- `api_usage` - Tracks OpenAI API usage per user (tokens, costs, model)
- `email_preferences` - User email notification preferences
- `email_logs` - Sent email tracking and analytics
- `password_resets` - Password reset tokens
- `email_connections` - Gmail/Outlook OAuth tokens for email import
- `parsed_bookings` - Extracted booking details from emails (flights, hotels, activities)
- `social_content_cache` - Cached content from Xiaohongshu, Reddit, etc. (unified multi-platform table)
- `xiaohongshu_cache` - DEPRECATED: Legacy Xiaohongshu cache (kept for backward compatibility)

### Map Integration Setup (Milestone 3.1)

The app uses **Mapbox GL JS** for interactive map visualization:

1. Sign up for a Mapbox account at https://www.mapbox.com/
2. Get your access token from the Mapbox dashboard
3. Add to `.env`:
   ```
   MAPBOX_ACCESS_TOKEN=pk.your-token-here
   VITE_MAPBOX_ACCESS_TOKEN=pk.your-token-here
   ```
4. Restart the dev server

**Features**:
- Auto-geocoding of itinerary items (location name → coordinates)
- Interactive map with color-coded day markers
- Route polylines connecting activities chronologically
- Distance/duration calculations for each day
- Click markers to see activity details
- Responsive 3-panel layout (Chat | Itinerary | Map)
- Mobile: Tab-based navigation

**Map API Endpoints**:
- `GET /api/map/geocode` - Convert location names to coordinates (cached)
- `POST /api/map/directions` - Get route polyline and distance/duration

**Frontend Components**:
- `src/components/MapView.tsx` - Main map component
- `src/services/mapApi.ts` - API client for geocoding and directions

**Auto-Geocoding**: When a trip is generated, the conversation engine automatically geocodes all activity titles using the Mapbox Geocoding API. Results are cached server-side to minimize API costs.

### Stripe Subscription System (Phase 4.1)

The app uses **Stripe** for subscription management with three tiers:

**Configuration**:
```bash
# Stripe API Keys
STRIPE_SECRET_KEY=sk_test_your-key
STRIPE_PUBLISHABLE_KEY=pk_test_your-key
STRIPE_WEBHOOK_SECRET=whsec_your-secret
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your-key

# Stripe Price IDs (create in Stripe Dashboard)
STRIPE_PRICE_ID_PRO=price_your-pro-price-id
STRIPE_PRICE_ID_TEAM=price_your-team-price-id
```

**Subscription Tiers**:
- **Free**: Limited trips, basic features
- **Pro**: Unlimited trips, GPT-4o, advanced features
- **Team**: Shared workspaces, collaboration tools

**Stripe API Endpoints**:
- `POST /api/subscriptions/create-checkout-session` - Start subscription flow
- `POST /api/subscriptions/create-portal-session` - Manage subscription
- `GET /api/subscriptions/status` - Get current subscription
- `POST /api/webhooks/stripe` - Handle Stripe webhooks

**Backend Components**:
- `server/services/stripe.ts` - Stripe API client
- `server/routes/subscriptions.ts` - Subscription endpoints
- `server/routes/webhooks.ts` - Webhook handlers
- `server/middleware/usageLimits.ts` - Enforce tier limits

**Frontend Components**:
- `src/pages/Profile.tsx` - Subscription management UI
- `src/components/SubscriptionPanel.tsx` - Pricing display
- `src/components/UsageWarning.tsx` - Usage limit warnings

### Email Notification System (Phase 4.3)

The app uses **Resend** for transactional emails and notifications.

**Configuration**:
```bash
# Resend API
RESEND_API_KEY=re_your-key
EMAIL_FROM=OtterlyGo <notifications@yourdomain.com>

# Weather API (for trip alerts)
WEATHER_API_KEY=your-openweathermap-key
```

**Email Types**:
- Welcome emails on signup
- Trip creation confirmations
- Trip reminders (7 days before departure)
- Weather alerts for upcoming trips
- Shared trip notifications
- Password reset emails

**Email API Endpoints**:
- `POST /api/email/send` - Send transactional email
- `GET /api/email/preferences` - Get user preferences
- `PATCH /api/email/preferences` - Update preferences
- `GET /api/email/unsubscribe/:token` - One-click unsubscribe

**Backend Components**:
- `server/services/emailService.ts` - Resend email client
- `server/services/emailTemplates.ts` - HTML email templates
- `server/routes/email.ts` - Email preference endpoints
- `server/jobs/emailJobs.ts` - Scheduled email tasks (node-cron)

**Frontend Components**:
- `src/pages/Profile.tsx` - Email preferences UI

### Email Import & Parsing (Phase 5.1)

The app can auto-import booking confirmations from Gmail and Outlook using OAuth.

**Configuration**:
```bash
# Gmail Import (Google OAuth)
GOOGLE_CLIENT_ID=your-oauth-client-id
GOOGLE_CLIENT_SECRET=your-oauth-secret

# Outlook Import (Microsoft OAuth)
MICROSOFT_CLIENT_ID=your-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-secret

# OAuth Encryption Key (auto-generated if not provided)
OAUTH_ENCRYPTION_KEY=your-encryption-key
```

**Supported Booking Types**:
- Flight confirmations (all major airlines)
- Hotel bookings (Booking.com, Airbnb, Hotels.com)
- Car rentals
- Restaurant reservations (OpenTable, Resy)
- Activity bookings (Viator, GetYourGuide)

**Email Import Endpoints**:
- `GET /api/email-import/gmail/auth` - Start Gmail OAuth flow
- `GET /api/email-import/gmail/callback` - OAuth callback
- `GET /api/email-import/outlook/auth` - Start Outlook OAuth flow
- `GET /api/email-import/outlook/callback` - OAuth callback
- `GET /api/email-import/connections` - List connected accounts
- `POST /api/email-import/scan` - Scan inbox for bookings
- `GET /api/email-import/bookings` - List parsed bookings
- `POST /api/email-import/bookings/:id/add-to-trip` - Add booking to trip

**Backend Components**:
- `server/services/gmailService.ts` - Gmail API client
- `server/services/outlookService.ts` - Outlook API client
- `server/services/emailParser.ts` - GPT-powered booking extraction
- `server/services/autoInsert.ts` - Auto-add bookings to trips
- `server/routes/emailImport.ts` - Email import endpoints

**Frontend Components**:
- `src/pages/EmailImport.tsx` - Email import UI with OAuth flow
- Shows parsed bookings with confidence scores
- One-click add to trip functionality
- Conflict detection for overlapping bookings

**How It Works**:
1. User connects Gmail/Outlook account via OAuth
2. Backend scans inbox for booking confirmation emails
3. GPT-4o extracts structured data (flight numbers, dates, locations)
4. Results are cached in `parsed_bookings` table
5. User reviews and adds bookings to trips with one click
6. Conflict detection prevents overlapping activities

### Multi-Platform Content Integration (Phase 5.2)

The app aggregates travel content from multiple social platforms to provide rich, user-generated travel suggestions.

**Supported Platforms**:
- **Xiaohongshu (小红书)**: Chinese travel platform with authentic local insights
- **Reddit**: Travel subreddit discussions and recommendations
- Future: TikTok, Instagram, Google Places

**No additional API keys required!** Content is aggregated using:
- Web scraping of public content
- LLM summarization and translation (GPT)
- Sample data fallback for reliability
- Database caching for performance

**Configuration**:
```bash
# Enable/disable Xiaohongshu integration (optional)
ENABLE_XIAOHONGSHU=false  # Set to true to enable
```

**Content API Endpoints**:
- `POST /api/content/aggregate` - Fetch content from multiple platforms
- Legacy endpoints (deprecated):
  - `POST /api/xiaohongshu/search` - Xiaohongshu-only search
  - `GET /api/xiaohongshu/stats` - Cache statistics

**Backend Components**:
- `server/services/content/aggregator.ts` - Multi-platform content aggregator
- `server/services/content/base.ts` - Base content provider interface
- `server/services/content/providers/xiaohongshu.ts` - Xiaohongshu provider
- `server/services/content/providers/reddit.ts` - Reddit provider
- `server/routes/content.ts` - Unified content API
- Database table: `social_content_cache` - Unified cache for all platforms

**Features**:
- Activity-centric content filtering
- Intelligent quality ranking based on engagement
- LLM-powered translation and summarization
- Multi-language support (Chinese, English)
- Database caching with 7-day TTL
- Engagement metrics (likes, comments, shares)
- Author attribution with profile pictures

### Admin Dashboard (Phase 4.4)

The app includes an admin dashboard for user management and analytics.

**Configuration**:
- Admin users are identified by `role: "admin"` in the database
- First user can be made admin manually in the database

**Admin Endpoints**:
- `GET /api/admin/users` - List all users with pagination
- `PATCH /api/admin/users/:id` - Update user (subscription, role)
- `GET /api/admin/stats` - System-wide statistics
- `GET /api/admin/usage` - API usage analytics

**Backend Components**:
- `server/routes/admin.ts` - Admin endpoints
- `server/middleware/adminAuth.ts` - Admin role verification
- `server/utils/costCalculation.ts` - API cost tracking

**Frontend Components**:
- `src/pages/AdminDashboard.tsx` - Full admin UI
- User management table with search and filters
- System statistics and usage charts
- Subscription management

## Architecture Overview

### Data Flow Pattern (Updated in Milestone 1.3)

OtterlyGo uses a **hybrid persistence strategy** with Zustand store:

**Client-Side (Milestone 1.0-1.2)**:
- Zustand store with localStorage persistence
- All state stored locally in browser

**Database Sync (Milestone 1.3+)**:
- Auto-save to PostgreSQL database
- Trip API for CRUD operations
- Debounced saves (1 second after changes)
- Temporary userId (replaced with auth in Milestone 2.1)

**Full Flow**:

1. **User Input** → Chat component → App.tsx handler
2. **App.tsx** calls `conversationEngine.sendMessage()` with current trip context
3. **Conversation Engine** sends POST request to `/api/chat` backend endpoint (fetch API)
4. **Backend Server** validates request (Zod), checks rate limit, and calls OpenAI API (GPT-3.5-turbo)
5. **GPT-3.5-turbo responds** with one of 4 JSON formats: `message`, `itinerary`, `suggestion`, or `update`
6. **Backend** returns response + token usage to frontend
7. **App.tsx** parses response and updates store (creates/updates trip, adds suggestion to message)
8. **React re-renders** Chat + ItineraryView components
9. **localStorage** automatically syncs via Zustand persist middleware

### Trip API (Milestone 1.3)

**File**: `server/routes/trips.ts`

REST endpoints for trip management:
```
POST   /api/trips       - Create trip
GET    /api/trips       - List trips (with pagination)
GET    /api/trips/:id   - Get single trip
PATCH  /api/trips/:id   - Update trip
DELETE /api/trips/:id   - Delete trip
```

**Frontend Integration**:
- `src/services/tripApi.ts` - API client functions
- Auto-save in `App.tsx` via useEffect (debounced 1 second)
- `useStore` actions: `saveTripToDatabase()`, `loadTripFromDatabase()`
- Sync status indicator in header

**Authentication** (Phase 2):
- Google OAuth 2.0 with Passport.js
- Email/password with bcrypt hashing
- JWT tokens stored in httpOnly cookies
- Password reset flow with email tokens
- Session management with 7-day expiration

### Backend Architecture (Phases 1-5)

The backend uses **Express.js** with TypeScript, running on port 3001:

**File Structure:**
```
server/
├── index.ts                    # Main Express app with CORS, Passport, JWT, Pino logging
├── config/
│   └── passport.ts             # Google OAuth strategy configuration
├── routes/
│   ├── auth.ts                 # Google OAuth + email/password authentication
│   ├── chat.ts                 # POST /api/chat - OpenAI proxy with usage tracking
│   ├── trips.ts                # Trip CRUD + sharing + status management
│   ├── map.ts                  # Mapbox geocoding & directions with caching
│   ├── photos.ts               # Unsplash photo search with caching
│   ├── share.ts                # Public share access (no auth required)
│   ├── user.ts                 # User profile and preferences management
│   ├── subscriptions.ts        # Stripe subscription management
│   ├── webhooks.ts             # Stripe webhooks for subscription events
│   ├── admin.ts                # Admin dashboard and user management
│   ├── email.ts                # Email notification preferences
│   ├── emailImport.ts          # Gmail/Outlook OAuth and booking parsing
│   ├── content.ts              # Multi-platform content aggregation
│   ├── xiaohongshu.ts          # DEPRECATED: Legacy Xiaohongshu endpoint
│   └── health.ts               # Health check endpoints (/, /health, /health/db)
├── middleware/
│   ├── auth.ts                 # JWT verification
│   ├── adminAuth.ts            # Admin role verification
│   ├── rateLimit.ts            # Rate limiting (per-IP and per-user)
│   ├── usageLimits.ts          # Subscription tier usage limits
│   └── validation.ts           # Zod request validation schemas
├── services/
│   ├── stripe.ts               # Stripe API client and subscription logic
│   ├── emailService.ts         # Resend email sending service
│   ├── emailTemplates.ts       # HTML email templates
│   ├── emailParser.ts          # GPT-powered booking extraction from emails
│   ├── gmailService.ts         # Gmail API client with OAuth
│   ├── outlookService.ts       # Outlook/Microsoft Graph API client
│   ├── autoInsert.ts           # Auto-add parsed bookings to trips
│   └── content/
│       ├── aggregator.ts       # Multi-platform content aggregator
│       ├── base.ts             # Base content provider interface
│       ├── activityExtractor.ts # Activity-centric filtering logic
│       └── providers/
│           ├── reddit.ts       # Reddit travel content provider
│           └── xiaohongshu.ts  # Xiaohongshu content provider
├── jobs/
│   └── emailJobs.ts            # Scheduled email tasks (node-cron)
├── utils/
│   ├── logger.ts               # Pino structured logging configuration
│   └── costCalculation.ts      # OpenAI API cost tracking
└── db.ts                       # Prisma client singleton
```

**Key Endpoint Categories:**
- **Core**: Health checks, chat (OpenAI proxy)
- **Auth**: Google OAuth, email/password, JWT, password reset
- **Trips**: CRUD, sharing, status management, tags
- **Content**: Map geocoding, photos, multi-platform social content
- **Monetization**: Stripe subscriptions, webhooks, usage tracking
- **Communication**: Email preferences, transactional emails
- **Integrations**: Gmail/Outlook email import, booking parsing
- **Admin**: User management, analytics, system stats

**Security Features:**
- Rate limiting: 20 requests/minute per IP + per-user limits
- Request validation: Zod schemas for all endpoints
- CORS: Configured for frontend origin
- Helmet: HTTP security headers
- JWT: Secure session management with httpOnly cookies
- API keys: Server-side only, never exposed to client
- OAuth tokens: Encrypted storage in database
- Input sanitization: Prevents SQL injection and XSS
- Admin routes: Protected with role-based access control

### Conversation Engine Response Types

The system prompt (in `server/routes/chat.ts`) instructs GPT-3.5-turbo to respond with typed JSON:

- **`type: "message"`** - Simple text response (follow-up questions, acknowledgments)
- **`type: "itinerary"`** - Full trip object with days/items (initial generation)
- **`type: "suggestion"`** - Suggestion card with images/quotes/links (when user requests ideas)
- **`type: "update"`** - Partial trip updates (when user requests modifications like "more food in Lima")

This structured approach makes parsing deterministic and enables rich UI rendering without prompt injection risks.

### State Management (Zustand)

`src/store/useStore.ts` contains all app state:

- **trip**: The current Trip object (null until generated)
- **messages**: Array of ChatMessage objects (includes user + assistant messages with optional suggestion cards)
- **conversationState**: Enum tracking conversation phase (initial/eliciting/ready/chatting)
- **isLoading**: Boolean for API call state

**Key actions:**
- `addItemToDay(dayIndex, item)` - Immutably adds item to day (used when "Add to Day X" is clicked)
- `removeItemFromDay(dayIndex, itemId)` - Removes item from day
- `updateTrip(updates)` - Merges partial updates into trip (used for modifications)

**Immutability pattern**: All updates create new objects via spreading (`{...state.trip}`) to trigger React re-renders.

### Component Hierarchy

**Main App Structure:**
```
App.tsx (React Router with protected routes)
├── Login.tsx - Landing page with Google OAuth
├── AuthCallback.tsx - OAuth callback handler
├── Dashboard.tsx - Trip list with filters and search
├── Home.tsx - Trip planning interface
│   ├── Chat.tsx (left pane with quick replies)
│   │   └── SuggestionCard.tsx (inline suggestions)
│   ├── ItineraryView.tsx (center pane with drag-and-drop)
│   │   └── ItineraryItemComponent (activity cards)
│   └── MapView.tsx (right pane with Mapbox)
├── SharedTrip.tsx - Public trip view (no auth required)
├── Profile.tsx - User settings and subscription management
│   ├── SubscriptionPanel.tsx (Stripe pricing cards)
│   └── UsageWarning.tsx (tier limit warnings)
├── EmailImport.tsx - Email import with OAuth flow
└── AdminDashboard.tsx - Admin user management (admin only)
```

**Key Responsibilities:**
- **App.tsx**: Route protection, authentication state, error boundaries
- **Home.tsx**: Orchestrates conversation, trip updates, map sync
- **Dashboard.tsx**: Trip list, filtering, archiving, status management
- **Chat.tsx**: Message display, quick replies, suggestion cards
- **ItineraryView.tsx**: Drag-and-drop editing, item CRUD, undo/redo
- **MapView.tsx**: Mapbox rendering, auto-geocoding, route display
- **Profile.tsx**: User preferences, email settings, subscription management
- **EmailImport.tsx**: OAuth flow, booking list, add to trip
- **AdminDashboard.tsx**: User table, system stats, subscription changes

### Tailwind CSS v4 Configuration

This project uses **Tailwind CSS v4** (new PostCSS-based architecture):

- `postcss.config.js` uses `@tailwindcss/postcss` (not `tailwindcss`)
- `src/index.css` uses `@import "tailwindcss"` (not `@tailwind` directives)
- `tailwind.config.js` still configures content paths

**Do not** revert to Tailwind v3 syntax (`@tailwind base/components/utilities`) or old PostCSS config.

### TypeScript Patterns

- **Type definitions**: All interfaces in `src/types/index.ts`
- **Avoid unused imports**: Build fails on unused type imports (configured in tsconfig)
- **Explicit return types**: Not required, but used for exported functions
- **Any types allowed**: Used in `conversationEngine.ts` for LLM response parsing (intentional escape hatch)

## Key Technical Decisions

### Backend Proxy (Milestone 1.1)
The app now uses an **Express backend proxy** to secure OpenAI API keys server-side. The frontend calls `/api/chat` which:
- Validates requests (Zod schemas)
- Enforces rate limiting (20 req/min per IP)
- Proxies to OpenAI API
- Returns structured JSON responses + token usage

This eliminates the security vulnerability of exposing API keys in browser code. The MVP originally used `dangerouslyAllowBrowser: true` for simplicity, but this has been removed.

### Why Structured JSON from LLM?
The system prompt enforces strict JSON response formats. This makes:
- Parsing deterministic (no regex extraction)
- UI rendering predictable (typed suggestion cards)
- Error handling simpler (JSON.parse try/catch)

The downside is GPT-3.5-turbo occasionally returns plain text instead of JSON, handled gracefully by falling back to `{message: assistantMessage}`.

### Why Flat Day Structure?
Days contain items directly without sub-grouping (no "morning/afternoon" buckets). This keeps Zustand updates simple - you can find an item by `dayIndex` + filter/map without nested traversal.

### Persistence Strategy
Zustand's `persist` middleware auto-syncs to localStorage under key `otterly-go-storage`. The entire store (trip + messages + state) is serialized. Refreshing the browser restores everything - no explicit save/load calls needed.

## Common Modifications

### Adding New Item Types
1. Add type to `ItemType` union in `src/types/index.ts`
2. Add emoji to `TYPE_ICONS` map in `src/components/ItineraryView.tsx`
3. Update system prompt examples in `conversationEngine.ts` if needed

### Changing LLM Model
Edit the `OPENAI_MODEL` environment variable in `.env` (defaults to `gpt-3.5-turbo`). Alternatively, update `server/routes/chat.ts` line with `process.env.OPENAI_MODEL || 'gpt-3.5-turbo'`.

### Modifying Conversation Prompts
Edit the `SYSTEM_PROMPT` constant in `server/routes/chat.ts`. The prompt includes JSON schema examples - keep the structure intact or update the parsing logic in the frontend `conversationEngine.ts`.

### Adding New Store Actions
1. Define action in `StoreState` interface in `useStore.ts`
2. Implement in the Zustand `create()` callback
3. Use immutable update patterns (spread operators) to ensure React re-renders

## Debugging Tips

- **Conversation not working?**
  - Check browser console for API errors
  - Verify backend is running on port 3001: `curl http://localhost:3001/health`
  - Check `.env` file has valid `OPENAI_API_KEY`
  - Check backend logs in terminal for OpenAI errors
- **Backend not starting?**
  - Ensure `.env` file exists with `OPENAI_API_KEY`
  - Check for port conflicts on 3001
  - Run `npm run dev:server` separately to see detailed errors
- **State not persisting?** Check browser localStorage for `otterly-go-storage` key
- **Build fails on Tailwind?** Ensure `@import "tailwindcss"` in index.css (not `@tailwind` directives) and `@tailwindcss/postcss` in postcss.config.js
- **TypeScript errors on unused vars?** Remove them - the build is strict about unused imports/variables
- **Rate limit errors?** Backend enforces 20 req/min per IP. Set `DISABLE_RATE_LIMIT=true` in `.env` for development
- **API key errors?**
  - 401: Invalid OpenAI API key in backend `.env`
  - 429: OpenAI rate limit exceeded or too many requests
  - 402: Insufficient OpenAI credits
- **Database connection errors?**
  - Check `DATABASE_URL` is set in `.env`
  - Verify database is running: `pg_isready` (for local PostgreSQL)
  - Test connection: `curl http://localhost:3001/health/db`
  - Check migrations applied: `npx prisma migrate status`
  - View database in GUI: `npx prisma studio`
- **Stripe errors?**
  - Verify `STRIPE_SECRET_KEY` and `STRIPE_PUBLISHABLE_KEY` are set
  - Check webhook secret matches Stripe dashboard: `STRIPE_WEBHOOK_SECRET`
  - Test webhook locally with Stripe CLI: `stripe listen --forward-to localhost:3001/api/webhooks/stripe`
- **Email not sending?**
  - Check `RESEND_API_KEY` is valid
  - Verify `EMAIL_FROM` domain is verified in Resend dashboard
  - Check email logs in database: `select * from email_logs order by created_at desc;`
- **Email import not working?**
  - Verify Google/Microsoft OAuth credentials are correct
  - Check OAuth redirect URIs match in cloud console
  - Review backend logs for API errors (Gmail/Outlook)
  - Check if OAuth tokens are encrypted correctly in database
- **Admin dashboard not accessible?**
  - User must have `role = 'admin'` in database users table
  - Manually update first user: `update users set role = 'admin' where id = 'user-id';`
- **Content aggregation failing?**
  - Check if `ENABLE_XIAOHONGSHU=true` in `.env` (if using Xiaohongshu)
  - Review backend logs for scraping errors
  - Fallback to sample data should work automatically
  - Check `social_content_cache` table for cached content
