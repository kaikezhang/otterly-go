# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Install dependencies
npm install

# Start dev server (opens on http://localhost:5173)
npm run dev

# Build for production (TypeScript check + Vite build)
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

## API Key Configuration

The app requires an OpenAI API key. Two options:
1. **Environment variable**: Create `.env` (copy from `.env.example`) and set `VITE_OPENAI_API_KEY`
2. **In-app**: Enter API key in the UI on first launch (stored in localStorage)

## Architecture Overview

### Data Flow Pattern

OtterlyGo uses a **centralized Zustand store** with localStorage persistence for all state:

1. **User Input** → Chat component → App.tsx handler
2. **App.tsx** calls `conversationEngine.sendMessage()` with current trip context
3. **Conversation Engine** sends user message + trip context to OpenAI API (GPT-3.5-turbo) with structured system prompt
4. **GPT-3.5-turbo responds** with one of 4 JSON formats: `message`, `itinerary`, `suggestion`, or `update`
5. **App.tsx** parses response and updates store (creates/updates trip, adds suggestion to message)
6. **React re-renders** Chat + ItineraryView components
7. **localStorage** automatically syncs via Zustand persist middleware

### Conversation Engine Response Types

The `conversationEngine.ts` system prompt instructs GPT-3.5-turbo to respond with typed JSON:

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
- Manages API key configuration flow
- Handles all conversation engine calls
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

### Why No Backend?
The app uses OpenAI SDK in browser mode (`dangerouslyAllowBrowser: true`) to ship a simple MVP. Production would add a backend proxy to secure API keys. This trade-off was acceptable to avoid auth/database complexity.

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
Edit `conversationEngine.ts` line with `model: 'gpt-3.5-turbo'` to use a different OpenAI model (e.g., `gpt-4o`, `gpt-4o-mini`, `gpt-4-turbo`).

### Modifying Conversation Prompts
Edit the `SYSTEM_PROMPT` constant in `src/services/conversationEngine.ts`. The prompt includes JSON schema examples - keep the structure intact or update the parsing logic in `sendMessage()`.

### Adding New Store Actions
1. Define action in `StoreState` interface in `useStore.ts`
2. Implement in the Zustand `create()` callback
3. Use immutable update patterns (spread operators) to ensure React re-renders

## Debugging Tips

- **Conversation not working?** Check browser console for API errors. Verify API key in localStorage (`openai_api_key`) or .env. The conversation engine is recreated when the API key changes.
- **State not persisting?** Check browser localStorage for `otterly-go-storage` key
- **Build fails on Tailwind?** Ensure `@import "tailwindcss"` in index.css (not `@tailwind` directives) and `@tailwindcss/postcss` in postcss.config.js
- **TypeScript errors on unused vars?** Remove them - the build is strict about unused imports/variables
- **API key errors?** The app validates the API key on first message send. Check for 401 errors in console (invalid key) or 429 (rate limit)
