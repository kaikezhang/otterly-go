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

### API Key Setup (Milestone 1.1)

The app requires an OpenAI API key configured on the **backend server**:

1. Copy `.env.example` to `.env`
2. Set `OPENAI_API_KEY=sk-...` with your OpenAI API key
3. Optionally configure `OPENAI_MODEL` (defaults to `gpt-3.5-turbo`)

**Security Note**: As of Milestone 1.1 (2025-10-06), API keys are stored server-side only. The frontend never sees or handles API keys.

### Database Setup (Milestone 1.2)

The app uses **PostgreSQL** with **Prisma ORM** for data persistence:

1. Set up a PostgreSQL database (local or hosted)
2. Add `DATABASE_URL` to `.env` (see `.env.example` for format)
3. Run migrations: `npx prisma migrate deploy`
4. Verify connection: `curl http://localhost:3001/health/db`

**For detailed setup instructions**, see [DATABASE_SETUP.md](./DATABASE_SETUP.md)

**Schema**:
- `users` - Account information (email, password_hash, subscription_tier)
- `trips` - Trip itineraries with JSON data (user_id, title, destination, dates, data_json)
- `conversations` - Chat history for trips (trip_id, messages_json)

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

### Xiaohongshu Integration (OPTIONAL - FREE!)

The app integrates with **Xiaohongshu** (小红书, Little Red Book) to provide travel suggestions based on real user-generated content from the platform.

**No setup required!** This feature works out of the box using:
- **Web scraping** of public Xiaohongshu search results
- **LLM summarization** (GPT-3.5-turbo) to translate Chinese → English
- **Sample data fallback** if scraping fails (works offline)
- **Database caching** to minimize requests and improve performance

**Features**:
- Search Xiaohongshu notes for travel content based on destination and activity type
- LLM-powered summarization of Chinese content into English
- Automatic quote extraction from popular notes
- Database caching to minimize API costs
- Engagement metrics (likes, comments) displayed with suggestions
- Direct links to original Xiaohongshu posts
- Author attribution with profile pictures

**Xiaohongshu API Endpoints**:
- `POST /api/xiaohongshu/search` - Search for travel suggestions
- `GET /api/xiaohongshu/stats` - View cached content statistics

**Backend Components**:
- `server/services/xiaohongshu.ts` - API client and caching service
- `server/routes/xiaohongshu.ts` - REST endpoints
- Database table: `xiaohongshu_cache` - Caches notes with summaries

**Frontend Components**:
- `src/services/xiaohongshuApi.ts` - Frontend API client
- `src/components/SuggestionCard.tsx` - Displays Xiaohongshu attribution

**How It Works**:
1. Frontend calls `/api/xiaohongshu/search` with destination and activity type
2. Backend scrapes public Xiaohongshu search page (or uses sample data)
3. LLM (GPT-3.5-turbo) summarizes Chinese content into English
4. Extracts quotes and engagement metrics (likes, comments)
5. Results are cached in PostgreSQL database for future use
6. Frontend displays suggestions with "Featured on Xiaohongshu" badge and author info

**Cost**: FREE! Uses web scraping + existing OpenAI API quota (same as chat).

**Fallback Strategy**: If scraping fails or is blocked:
- Uses realistic sample data (Chinese travel content)
- Still processes through LLM for authentic-looking suggestions
- App continues working seamlessly without real-time data

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

**Temporary Auth** (until Milestone 2.1):
- userId generated on first visit and stored in localStorage
- Passed in request body/query params
- Will be replaced with JWT authentication

### Backend Architecture (Milestone 1.1-1.3)

The backend uses **Express.js** with TypeScript, running on port 3001:

**File Structure:**
```
server/
├── index.ts                    # Main Express app, CORS, error handling
├── routes/
│   └── chat.ts                 # POST /api/chat endpoint
└── middleware/
    ├── rateLimit.ts            # Rate limiting (20 req/min)
    └── validation.ts           # Zod request validation
```

**Key Endpoints:**
- `GET /health` - Health check (returns `{status: "ok", timestamp: "..."}`)
- `POST /api/chat` - Proxy to OpenAI (validates, rate limits, returns JSON + usage)

**Security Features:**
- Rate limiting: 20 requests/minute per IP
- Request validation: Zod schemas
- CORS: Configured for frontend origin
- API key: Server-side only, never exposed to client

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

```
App.tsx (orchestration layer)
├── Chat.tsx (left pane, full-width until trip exists)
│   └── SuggestionCard.tsx (rendered inline when message has suggestionCard)
└── ItineraryView.tsx (right pane, appears after trip generation)
    └── ItineraryItemComponent (internal, shows each activity)
```

**App.tsx responsibilities:**
- Handles all conversation engine calls (via backend proxy)
- Bridges between Chat actions (onAddSuggestionToDay) and store updates (addItemToDay)
- Orchestrates itinerary modification actions (Replace/Remove/Add Suggestion)

**Chat.tsx** is purely presentational - it displays messages and emits events. It doesn't know about the trip structure.

**ItineraryView.tsx** shows the trip and emits action requests (onRemoveItem, onRequestSuggestion, onRequestReplace) that App.tsx translates into new conversation engine calls.

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
