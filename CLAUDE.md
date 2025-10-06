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

## API Key Configuration

The app requires an OpenAI API key configured on the **backend server**:

1. Copy `.env.example` to `.env`
2. Set `OPENAI_API_KEY=sk-...` with your OpenAI API key
3. Optionally configure `OPENAI_MODEL` (defaults to `gpt-3.5-turbo`)

**Security Note**: As of Milestone 1.1 (2025-10-06), API keys are stored server-side only. The frontend never sees or handles API keys.

## Architecture Overview

### Data Flow Pattern

OtterlyGo uses a **centralized Zustand store** with localStorage persistence for all state:

1. **User Input** → Chat component → App.tsx handler
2. **App.tsx** calls `conversationEngine.sendMessage()` with current trip context
3. **Conversation Engine** sends POST request to `/api/chat` backend endpoint (fetch API)
4. **Backend Server** validates request (Zod), checks rate limit, and calls OpenAI API (GPT-3.5-turbo)
5. **GPT-3.5-turbo responds** with one of 4 JSON formats: `message`, `itinerary`, `suggestion`, or `update`
6. **Backend** returns response + token usage to frontend
7. **App.tsx** parses response and updates store (creates/updates trip, adds suggestion to message)
8. **React re-renders** Chat + ItineraryView components
9. **localStorage** automatically syncs via Zustand persist middleware

### Backend Architecture (Milestone 1.1)

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
