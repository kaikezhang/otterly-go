# 🦦 OtterlyGo

A conversational, content-rich travel planner that helps you co-create realistic day-by-day itineraries through natural conversation.

## What It Does

OtterlyGo is an MVP that demonstrates:
- **Conversational planning**: Tell it about your trip, answer a few questions, and get a balanced day-by-day itinerary
- **Rich suggestions**: Request ideas and receive cards with images, traveler quotes (Chinese + English), and source links
- **One-click actions**: Add or replace activities in your itinerary with a single click
- **Local persistence**: Refresh the browser and your chat + itinerary are restored
- **No sign-in required**: Everything runs locally in your browser (data stored in localStorage)

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- OpenAI API key ([get one here](https://platform.openai.com/api-keys))

### Installation

```bash
# Install dependencies
npm install

# Optional: Set your API key in .env (or enter it in the UI)
cp .env.example .env
# Edit .env and add your key: VITE_OPENAI_API_KEY=sk-...

# Start the dev server
npm run dev
```

Open http://localhost:5173 and start planning!

### First-Time Setup

If you didn't set `VITE_OPENAI_API_KEY` in `.env`, you'll see a configuration screen:
1. Enter your OpenAI API key (get one from [platform.openai.com/api-keys](https://platform.openai.com/api-keys))
2. Click "Start Planning"
3. Your key is stored in localStorage for future sessions

**Troubleshooting API Key Issues:**
- Make sure your API key starts with `sk-proj-` or `sk-`
- Check that your API key has credits available at [platform.openai.com/account/billing](https://platform.openai.com/account/billing)
- Open browser DevTools Console to see detailed error messages
- If you get a 401 error, your API key is invalid
- If you get a 429 error, you've hit the rate limit
- If you get an "insufficient_quota" error, add credits to your OpenAI account

**Test your API key:**
```bash
# Test if your API key works before running the app
node test-api-key.js sk-your-key-here

# Or if you set it in .env:
node test-api-key.js
```

## How to Use

### Primary Use Case (Validation)

Try this flow to validate the MVP:

1. **Initial message**: "9 days in Peru, must see Machu Picchu, light hiking and culture"
2. **Answer follow-ups**: The assistant will ask about dates, pace (fast/medium/slow), and interests
3. **Review itinerary**: Once generated, you'll see a day-by-day plan in the right sidebar
4. **Request a suggestion**: "I have an extra day after Machu Picchu, suggest something"
5. **See Rainbow Mountain card**: Review images, quotes, and source links
6. **Add to itinerary**: Click "Add to Day 6" and see it appear in your plan
7. **Modify preferences**: Say "Less hiking, more food in Lima" and watch the plan update

### Features You Can Try

- **Add activities**: Click "+ Add suggestion" in any day
- **Replace items**: Hover over an activity and click "Replace"
- **Remove items**: Hover and click "Remove"
- **Request changes**: Ask for modifications like "more rest days" or "focus on food"
- **Refresh persistence**: Reload the browser—your chat and itinerary are restored

## Architecture & Rationale

### Why These Choices?

**Frontend Stack**
- **React + TypeScript + Vite**: Fast, modern, type-safe development with instant HMR
- **Tailwind CSS**: Utility-first styling for rapid UI development without CSS files
- **Zustand + persist middleware**: Lightweight state management (~3KB) with built-in localStorage persistence

**No Backend**
- **Direct LLM integration**: OpenAI SDK in browser mode (dangerouslyAllowBrowser) keeps the MVP simple
- **localStorage**: Meets the requirement for local draft save/resume without auth/database complexity
- **Trade-off**: API key exposed in browser, but acceptable for MVP (production would use backend proxy)

**Conversation Design**
- **Structured JSON responses**: LLM returns typed JSON for itineraries/suggestions, making the UI predictable
- **System prompt engineering**: Clear format instructions ensure consistent, parseable responses
- **Stateful conversation**: Full message history sent to maintain context across exchanges

**Data Model**
- **Flat day structure**: Days contain items directly (no sub-nesting), keeping updates simple
- **Immutable updates**: Zustand uses spreading to ensure React re-renders correctly
- **Rich suggestion cards**: Embedded in chat messages, not separate state, keeping UX coherent

### Project Structure

```
src/
├── types/           # TypeScript interfaces (Trip, Day, SuggestionCard, etc.)
├── store/           # Zustand store with localStorage persistence
├── services/        # Conversation engine (LLM integration)
├── components/      # React components (Chat, ItineraryView, SuggestionCard)
├── App.tsx          # Main app orchestration
└── main.tsx         # React entry point
```

### Key Design Patterns

1. **Separation of concerns**: Chat UI doesn't know about itinerary logic; App orchestrates
2. **Optimistic updates**: Add/remove items update state immediately (no async wait)
3. **Graceful degradation**: Errors show banner but don't break the experience
4. **Accessibility**: ARIA labels, keyboard navigation, focus management

## Content Approach

The conversation engine instructs the LLM to:
- Include 2-3 images per suggestion (using Unsplash-style URLs as placeholders)
- Provide 2-3 sentence summaries of "why it's popular/what to expect"
- Include 1-2 traveler quotes with both Chinese original and English translation
- Link to 1-3 sources (e.g., Xiaohongshu note URLs)

**For MVP**: Content is LLM-generated based on its training data. Production would integrate real APIs (Xiaohongshu, Google Places, etc.) for verified images/quotes/links.

## Limitations & Future Work

**Out of Scope for MVP**:
- User accounts / multi-device sync
- Actual bookings or reservations
- Map visualization or route optimization
- Collaboration (sharing itineraries)
- Budget tracking
- Offline mode
- Real-time content scraping

**Production Considerations**:
- Backend API proxy to secure API keys
- Real content sources (Xiaohongshu API, travel blogs)
- Image optimization and CDN
- Rate limiting and error recovery
- Analytics and user feedback loops

## Testing

The primary acceptance flow is manual:
1. Start conversation: "9 days in Peru..."
2. Answer 2-3 questions
3. Receive realistic itinerary
4. Request "Rainbow Mountain" suggestion
5. See card with images/quotes/links
6. Add to day and see update
7. Request "less hiking, more food in Lima"
8. Refresh browser and see state restored

**Automated tests** (future): Could add Vitest + React Testing Library for component tests, but deferred for MVP to ship faster.

## Build & Deploy

```bash
# Production build
npm run build

# Preview production build
npm run preview

# Deploy to Vercel/Netlify/etc
# Upload the `dist/` folder
```

## License

MIT

---

**Built for the OtterlyGo MVP challenge**
Demonstrates conversational travel planning with rich content cards and local-first persistence.
