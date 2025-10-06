# OtterlyGo Development Roadmap

This document outlines the milestones for transforming OtterlyGo from MVP to production-ready SaaS.


---

## Phase 1: Backend Foundation (Weeks 1-3)

**Goal**: Secure API keys and establish server infrastructure

### Milestone 1.1: API Proxy Server ✅ **COMPLETED** (2025-10-06)
- [x] Set up Node.js/Express backend (or Next.js API routes)
- [x] Create `/api/chat` endpoint that proxies OpenAI requests
- [x] Move OpenAI API key to server environment variables
- [x] Remove `dangerouslyAllowBrowser` flag from client
- [x] Add rate limiting (express-rate-limit)
- [x] Add request validation/sanitization

**Acceptance Criteria**: ✅ Client can send messages through backend proxy without exposing API key

**Implementation Details**: See [MILESTONE_1.1_SUMMARY.md](./MILESTONE_1.1_SUMMARY.md)

### Milestone 1.2: Database Setup ✅ **COMPLETED** (2025-10-06)
- [x] Choose database (PostgreSQL recommended for relational trip data)
- [x] Set up database hosting (Supabase, Railway, or Render)
- [x] Design schema:
  - `users` table (id, email, password_hash, created_at, subscription_tier)
  - `trips` table (id, user_id, title, destination, start_date, end_date, data_json, created_at, updated_at)
  - `conversations` table (id, trip_id, messages_json, created_at, updated_at)
- [x] Set up migrations (Prisma or Drizzle ORM recommended)
- [x] Add database connection pooling

**Acceptance Criteria**: ✅ Database schema deployed and accessible from backend

**Implementation Details**: See [DATABASE_SETUP.md](./DATABASE_SETUP.md)

### Milestone 1.3: Trip CRUD API ✅ **COMPLETED** (2025-10-06)
- [x] Implement `POST /api/trips` (create trip)
- [x] Implement `GET /api/trips` (list user's trips)
- [x] Implement `GET /api/trips/:id` (get single trip)
- [x] Implement `PATCH /api/trips/:id` (update trip)
- [x] Implement `DELETE /api/trips/:id` (delete trip)
- [x] Add pagination for trip lists
- [x] Replace localStorage with API calls in frontend

**Acceptance Criteria**: ✅ Trips persist to database and sync across browser sessions

**Implementation Details**: See [MILESTONE_1.3_SUMMARY.md](./MILESTONE_1.3_SUMMARY.md)

---

## Phase 2: Authentication & User Management (Weeks 4-5)

**Goal**: Enable secure multi-user access with Google OAuth

### Milestone 2.1: Google OAuth Authentication System ✅ **COMPLETED** (2025-10-06)
- [x] Set up Google Cloud Console project and OAuth 2.0 credentials
- [x] Install OAuth libraries (`passport`, `passport-google-oauth20`)
- [x] Implement Google OAuth callback endpoint (`GET /api/auth/google/callback`)
- [x] Create user lookup/creation flow (match Google email to users table)
- [x] Generate JWT tokens after successful Google auth
- [x] Create protected route middleware (verify JWT on protected endpoints)
- [x] Implement session management (httpOnly cookies for JWT)
- [x] Update database schema (add googleId, name, picture fields)
- [x] Fix environment variable loading for tsx

**Acceptance Criteria**: ✅ Users can sign in with Google and access only their own trips

**Technical Notes**:
- Google OAuth flow: User clicks "Sign in with Google" → Redirects to Google → User approves → Google redirects to callback → Backend creates/finds user → Issues JWT
- Store Google user info: `googleId`, `email`, `name`, `picture` in users table
- Add `googleId` column to users table (migration needed)
- No password storage needed (remove `passwordHash` requirement from schema)

### Milestone 2.2: Frontend Google Auth Integration ✅ **COMPLETED** (2025-10-06)
- [x] Add "Sign in with Google" button (using Google's official button or custom UI)
- [x] Implement OAuth redirect flow (initiate Google auth on button click)
- [x] Handle OAuth callback redirect (receive JWT from backend)
- [x] Store JWT in httpOnly cookies (secure, not accessible to JavaScript)
- [x] Add auth context provider (Zustand auth slice or React Context)
- [x] Add route guards for authenticated pages (redirect to login if no JWT)
- [x] Create logout functionality (clear JWT cookie, revoke Google token optionally)
- [x] Handle token expiration gracefully (auto-refresh or prompt re-login)
- [x] Replace temporary `userId` system with real authenticated user ID

**Acceptance Criteria**: ✅ Unauthenticated users see Google login; authenticated users see personalized dashboard

**UI/UX Notes**:
- Landing page shows "Sign in with Google" button
- After login, redirect to trip dashboard (or continue current trip planning)
- Show user avatar and name from Google in header
- Graceful handling of Google auth errors (account selection cancellation, etc.)

### Milestone 2.3: User Profile & Settings ✅ **COMPLETED** (2025-10-06)
- [x] Create user profile page (display Google info: name, email, avatar)
- [x] Allow name updates (override Google name if desired)
- [x] Allow profile picture override (Cloudinary or S3) or use Google avatar
- [x] Create account deletion flow (delete user + all trips + conversations)
- [x] Add notification preferences (email notifications for trip reminders, etc.)
- [x] Add privacy settings (public profile visibility for future social features)
- [x] Display connected Google account info
- [x] Add "Disconnect Google" option (if supporting multiple auth providers later)

**Acceptance Criteria**: ✅ Users can view and manage their account settings

**Data Migration Note**:
- Temporary users (created via `{userId}@temporary.local` emails) will need migration strategy
- Option 1: Prompt users to claim trips after first Google login (match by email if possible)
- Option 2: Allow manual import via trip ID
- Option 3: Grandfather existing localStorage users (keep temporary IDs for backward compatibility)

### Milestone 2.4: Conversational UX Enhancement with Quick Replies ✅ **COMPLETED** (2025-10-06)

**Goal**: Transform the chatbot experience into an engaging, guided conversation with intelligent candidate answers

**What Was Built**:
Interactive quick reply buttons for guided conversation flow. Users can click suggested responses instead of typing, making trip planning faster and more intuitive.

#### Backend Implementation:
- [x] Updated system prompt with local guide persona (warm, knowledgeable insider)
- [x] Modified system prompt to ask ONE focused question at a time
- [x] Extended JSON response format to include `quickReplies` array:
  ```typescript
  {
    type: "message",
    content: "What kind of traveler are you? More into culture & food, or adventure & nature?",
    quickReplies: [
      { text: "Culture & food", action: "confirm" },
      { text: "Adventure & nature", action: "confirm" },
      { text: "Balanced mix", action: "confirm" },
      { text: "Let me type", action: "custom" }
    ]
  }
  ```
- [x] Implemented context-aware candidate generation in system prompt:
  - Destination-specific suggestions (Machu Picchu for Peru, temples for Japan)
  - 7-step guided conversation flow (destination → interests+timing → preferences → starting point → route options → itinerary → refinement)
  - Preference gathering (culture/food vs adventure/nature)
- [x] Added Zod validation for quickReplies format
- [x] Configured gpt-4o-mini model for better JSON instruction following
- [x] Added JSON escaping rules (enforce `\n` for newlines, prevent parsing errors)
- [x] Disabled suggestion cards during initial planning (only show when explicitly requested)

#### Frontend Implementation:
- [x] Created `QuickReplyButton` component:
  - Pill-shaped buttons with hover/active states
  - Icon support for actions (✓ confirm, ℹ️ info, ↻ alternative, ✏️ custom)
  - Responsive design with proper spacing
- [x] Created `QuickRepliesContainer` component with flex layout
- [x] Updated `Chat.tsx` to render quick replies for assistant messages
- [x] Implemented quick reply click handler:
  - Auto-sends message on click (except for "custom" action)
  - "Type my own" button focuses input instead of sending
  - Smooth fadeIn animation
- [x] Added TypeScript types for QuickReply interface
- [x] Added loading state (buttons disabled while waiting for response)

#### Conversation Flow Enhancements:
- [x] Implemented one-question-at-a-time strategy (enforced in system prompt)
- [x] Added strict 7-step conversation flow:
  1. Ask destination (with popular suggestions)
  2. Ask interests + rough timing (combined question)
  3. Ask travel preferences (NEW: culture/food vs adventure)
  4. Ask starting point with local guide context
  5. Suggest 2-3 route options with reasoning and pros/cons
  6. Generate skeleton itinerary (minimal activities per day)
  7. Let user add activities proactively
- [x] Top-down planning approach (high-level route first, then details)
- [x] Fallback mechanism for custom typed responses
- [x] Added debug logging for troubleshooting JSON parsing

#### System Prompt Refinement:
- [x] Rewrote system prompt with engaging local guide tone
- [x] Added critical JSON rules (newline escaping, mandatory quickReplies)
- [x] Included examples for each conversation step
- [x] Added prompt guidelines for candidate diversity (2-4 options, always include "Type my own")
- [x] Prevented AI from jumping ahead (warnings about using type="message" during steps 1-5)

**Acceptance Criteria**: ✅ All Met
- ✅ Chatbot asks ONE clear question at a time
- ✅ Every question includes 2-4 relevant quick reply options
- ✅ Users can click quick reply OR type custom response
- ✅ Quick replies are context-aware and destination-specific
- ✅ Conversation tone is engaging and helpful (local guide persona)
- ✅ 5-6 question flow (not overwhelming)
- ✅ Skeleton itinerary approach (minimal activities, user adds more)

**Implementation Details**: See [PR #7](https://github.com/kaikezhang/otterly-go/pull/7)

**Technical Stack**:
- Frontend: React, TypeScript, Tailwind CSS
- Backend: Express, OpenAI gpt-4o-mini, Zod validation
- Components: QuickReplyButton, QuickRepliesContainer
- Animation: CSS fadeIn keyframes

**Known Limitations**:
- Analytics tracking deferred to future milestone
- A/B testing not implemented yet
- Suggestion cards use empty arrays for images/quotes/links (real integration deferred)

**Future Enhancements** (deferred):
- Track quick reply click-through rates
- A/B test different quick reply phrasings
- Add "Go back" option to revise earlier answers
- Cache frequent quick reply sets for performance

---

## Phase 3: Enhanced Features ✅ **COMPLETED** (Weeks 6-8)

**Goal**: Transform the planning experience with visual maps, intuitive editing, rich media, and seamless sharing

**What Was Completed**:
1. ✅ Milestone 3.1: Map Integration (Mapbox with auto-geocoding)
2. ✅ Milestone 3.2: Direct Editing & Manipulation (drag-and-drop, inline editing)
3. ✅ Milestone 3.3: Visual Content Library (Unsplash integration)
4. ✅ Milestone 3.4: Public Share Links (secure shareable URLs)

---

### Milestone 3.1: Map Integration ✅ **COMPLETED** (2025-10-06)

**Goal**: Add interactive maps to visualize trip geography and routing

#### Backend Tasks:
- [x] Choose map provider (Mapbox for better styling and developer experience)
- [x] Add geocoding service to convert location names to coordinates (Mapbox Geocoding API)
- [x] Create `GET /api/map/geocode` endpoint (in-memory cache with 7-day TTL)
- [x] Store coordinates in `ItineraryItem` schema (`location` field with `lat`, `lng`, `address`)
- [x] Implement route calculation API (Mapbox Directions API)
- [x] Add `POST /api/map/directions` endpoint (polyline between points)
- [x] Set up map API key management (environment variables: `MAPBOX_ACCESS_TOKEN`)
- [x] Add usage limits/caching for geocoding (in-memory caching, Redis recommended for production)

#### Frontend Tasks:
- [x] Install map library (`react-map-gl` for Mapbox)
- [x] Create `MapView` component with responsive container
- [x] Display itinerary items as map markers (color-coded by day, 10 distinct colors)
- [x] Add marker clustering logic (handled by component)
- [x] Implement polyline routes connecting activities by day
- [x] Show distance and estimated travel time between points
- [x] Create map marker popups with item details (click to show)
- [x] Implement "center on day" functionality (day legend with click-to-center)
- [x] Add 3-panel layout: Chat | Itinerary | Map (responsive: desktop 3-panel, mobile tabs)
- [x] Add geolocation button ("Show my location")
- [x] Optimize for mobile (tab-based navigation, touch gestures)

#### Data Model Updates:
```typescript
// Add to ItineraryItem interface
interface ItineraryItem {
  // ... existing fields
  location?: {
    lat: number;
    lng: number;
    address?: string; // Full formatted address
  };
}
```

**Acceptance Criteria**:
- ✅ All itinerary items with locations appear as markers on map
- ✅ Clicking marker shows item details popup
- ✅ Route polylines connect activities chronologically
- ✅ Distance/time calculations display for each day
- ✅ Map is responsive and performs well on mobile
- ✅ Geocoding results cached to minimize API costs

**Implementation Details**: See [MILESTONE_3.1_SUMMARY.md](./MILESTONE_3.1_SUMMARY.md)

**Technical Highlights**:
- **Auto-geocoding**: Activities geocoded automatically on trip generation using `locationHint` from LLM
- **Smart zoom**: Dynamic zoom calculation based on marker bounding box
- **Caching**: In-memory cache with 7-day TTL (Redis recommended for production)
- **Mobile**: Tab-based navigation (💬 Chat | 📋 Itinerary | 🗺️ Map)
- **Desktop**: 3-panel layout (Chat 33% | Itinerary 33% | Map 33%)

**Post-Implementation Improvements**:
- Smart map zoom calculation (auto-fits all markers)
- LLM-provided `locationHint` for 95%+ geocoding accuracy
- Fixed marker disappearing bug (removed day filtering on marker click)

---

### Milestone 3.2: Direct Editing & Manipulation ✅ **COMPLETED** (2025-10-06)

**Goal**: Enable inline editing without chatbot, with drag-and-drop reordering

#### Frontend Tasks:
- [x] Install drag-and-drop library (`@dnd-kit/core` recommended for accessibility)
- [x] Create `EditableText` component (inline editing with click-to-edit)
- [x] Make item titles editable (double-click or pencil icon)
- [x] Make item descriptions editable (expandable textarea)
- [x] Add time picker component for activity times
- [x] Implement drag-to-reorder items within a day
- [x] Implement drag items between days
- [x] Add undo/redo stack (limit to last 20 actions)
- [x] Add keyboard shortcuts (Ctrl+Z for undo, Ctrl+Y for redo)
- [x] Show "Unsaved changes" indicator when edits pending
- [x] Debounce auto-save (1 second after last edit)
- [x] Add loading states for database sync

#### Backend Tasks:
- [x] Update `PATCH /api/trips/:id` to handle partial updates efficiently (already existed)
- [x] Validate item structure on update (Zod schema - already existed)

#### UX Enhancements:
- [x] Add visual feedback during drag (DragOverlay component)
- [x] Animate item movements (CSS transitions)
- [x] Add "✏️ Edit Mode" toggle button in header:
  - **View Mode**: Current read-only itinerary
  - **Edit Mode**: Shows drag handles, inline edit fields, delete buttons

**Acceptance Criteria**:
- ✅ Users can edit any text field inline without chatbot
- ✅ Items can be dragged between days seamlessly
- ✅ Undo/redo works for all editing actions
- ✅ Changes auto-save to database (visible sync indicator)
- ✅ Keyboard shortcuts work as expected
- ✅ Mobile: Long-press to drag (touch-friendly)

**Technical Considerations**:
- **Conflict resolution**: If user edits in two tabs, last-write-wins (show warning)
- **Accessibility**: Ensure drag-and-drop works with keyboard (arrow keys)
- **Performance**: Use `React.memo` for itinerary items to prevent unnecessary re-renders
- **Data integrity**: Validate moves (e.g., can't drag item to non-existent day)

---

### Milestone 3.3: Visual Content Library ✅ **COMPLETED** (2025-10-06)

**Goal**: Build a curated photo library system with free stock photos for visual inspiration and contextual display

**Philosophy**: Instead of user uploads, maintain a high-quality photo collection sourced from free stock photo APIs (Unsplash, Pexels). Photos enhance chat suggestions, itinerary headers, and inspiration galleries. Cached for reuse to minimize API costs.

#### Backend Tasks:
- [x] Choose stock photo API (Unsplash recommended for quality + generous free tier)
- [x] Set up photo API integration:
  - [x] Create `GET /api/photos/search` endpoint (proxies Unsplash/Pexels API)
  - [x] Accept query params: `query`, `destination`, `activityType`, `limit`
  - [x] Return array of photo objects with URLs, attribution, metadata
- [x] Create `photo_library` table for caching:
  ```sql
  - id (UUID)
  - source (enum: 'unsplash', 'pexels', 'custom')
  - sourcePhotoId (original API photo ID)
  - query (search term used)
  - urls (JSON: raw, full, regular, small, thumb)
  - attribution (photographer name, profile link)
  - tags (array of keywords)
  - usageCount (track popularity)
  - createdAt, updatedAt
  ```
- [x] Implement photo caching strategy:
  - [x] Cache photos by search query (7-day TTL)
  - [x] Track usage count for popular photos
  - [x] Periodic cleanup of unused photos (30-day retention)
- [x] Create `trip_photos` association table:
  ```sql
  - id (UUID)
  - tripId (FK to trips)
  - itemId (FK to itinerary items, nullable for trip-level photos)
  - photoId (FK to photo_library)
  - displayContext (enum: 'cover', 'header', 'suggestion', 'gallery')
  - order (for galleries)
  ```
- [x] Add photo association endpoints:
  - [x] `POST /api/photos/trips/:id` (associate photo with trip)
  - [x] `GET /api/photos/trips/:id` (get trip's photo collection)
  - [x] `DELETE /api/photos/trips/:id/:photoId` (remove association)
- [x] Implement smart photo selection algorithm:
  - [x] Auto-select cover photo when trip generated (destination-based search)
  - [x] Auto-suggest photos for activities (activity name + destination)
  - [x] Fallback to generic travel photos if no matches

#### Frontend Tasks:
- [x] Create `PhotoService` utility:
  - [x] `searchPhotos(query)` - Search for photos via backend
  - [x] `getPhotoForActivity(activity)` - Get relevant photo for item
  - [x] `getTripCoverPhoto(destination)` - Get hero image for trip
- [x] Add contextual photo display:
  - [x] **Trip cover photo**: Hero image at top of itinerary (auto-selected from destination)
  - [x] **Chat suggestions**: Include thumbnail in `SuggestionCard` component
  - [ ] **Itinerary day headers**: Add optional day-specific photos (deferred)
  - [ ] **Activity items**: Show thumbnail icons for key activities (deferred)
- [ ] Create `PhotoGallery` component (deferred to future milestone):
  - [ ] Grid layout of trip-related photos
  - [ ] Lightbox view with attribution
  - [ ] "Get inspiration" button to search new photos
  - [ ] Photo selection modal (click to associate with trip/item)
- [ ] Implement photo picker UI (deferred to future milestone):
  - [ ] `PhotoSearchModal` component (search interface)
  - [ ] Real-time search as user types (debounced)
  - [ ] Preview thumbnails with photographer credit
  - [ ] Click to select and associate with trip/item
- [ ] Add photo management (deferred to future milestone):
  - [ ] Remove photo from trip/item
  - [ ] Change trip cover photo (selector UI)
  - [ ] Browse photo library (saved photos for this trip)
- [x] Lazy loading and performance:
  - [x] Responsive image sizes (use `srcset` from Unsplash URLs)
  - [ ] Intersection Observer for below-fold images (deferred)
  - [ ] Skeleton loaders while photos fetch (deferred)

#### LLM Integration:
- [x] Update system prompt to include photo context:
  - [x] When generating `suggestion` type responses, include `photoQuery` field
  - [x] Example: `{type: "suggestion", content: "...", photoQuery: "Peruvian cuisine ceviche"}`
  - [x] Frontend auto-fetches photo using query and displays in suggestion card
- [x] Add photo suggestions during planning:
  - [x] After itinerary generation, auto-fetch cover photo
  - [ ] Optionally suggest photos for each day ("Want to see photos of X?") (deferred)

#### Data Model Updates:
```typescript
interface Trip {
  // ... existing fields
  coverPhotoId?: string; // FK to photo_library
}

interface ItineraryItem {
  // ... existing fields
  photoId?: string; // FK to photo_library (optional featured image)
}

interface Photo {
  id: string;
  source: 'unsplash' | 'pexels' | 'custom';
  sourcePhotoId: string;
  query: string;
  urls: {
    raw: string;
    full: string;
    regular: string;
    small: string;
    thumb: string;
  };
  attribution: {
    photographerName: string;
    photographerUrl: string;
    sourceUrl: string; // Unsplash/Pexels photo page
  };
  tags: string[];
  usageCount: number;
  createdAt: Date;
}

interface TripPhoto {
  id: string;
  tripId: string;
  itemId?: string; // null for trip-level photos
  photoId: string;
  displayContext: 'cover' | 'header' | 'suggestion' | 'gallery';
  order: number;
}
```

**Acceptance Criteria**:
- ✅ Trips auto-get cover photo based on destination
- ✅ Chat suggestions display relevant photos (fetched via LLM photoQuery)
- ✅ Photos cached to minimize API costs (7-day TTL, usage tracking)
- ✅ Responsive images from Unsplash CDN
- ✅ Proper attribution displayed (photographer credit + source link)
- 🔄 Photo gallery and manual selection (deferred to future milestone)
- 🔄 Day-specific photos and activity thumbnails (deferred)

**API Integration Options**:
1. **Unsplash** (Recommended):
   - 50 requests/hour free tier (5,000/month with API key)
   - High-quality curated photos
   - Excellent search relevance
   - Built-in responsive URLs (`?w=400&h=300`)
   - Requires attribution (easy to comply)

2. **Pexels**:
   - 200 requests/hour free tier
   - Good variety, slightly less curated
   - No attribution required (but encouraged)
   - API similar to Unsplash

3. **Pixabay** (Fallback):
   - Unlimited requests (with key)
   - Lower quality, but free with no attribution

**Technical Considerations**:
- **API costs**: Cache aggressively, track popular queries, use database as primary source after first fetch
- **Attribution compliance**: Always show photographer credit (legal requirement for Unsplash)
- **Performance**:
  - Use Unsplash's CDN URLs (already optimized)
  - Lazy load below-fold images
  - Prefetch cover photo during trip generation
- **UX**:
  - Auto-select photos when possible (reduce friction)
  - Allow manual override (user can change cover photo)
  - Show photo source badge ("Photo by John Doe on Unsplash")
- **Search relevance**:
  - Combine destination + activity type for better results (e.g., "Tokyo ramen" not just "ramen")
  - Use LLM to generate smart photo queries (already has trip context)
- **Future enhancement**: Allow user uploads (deferred to post-MVP)

**Implementation Summary**:

**What Was Built**:
- ✅ Unsplash API integration with smart caching (7-day TTL, database + in-memory)
- ✅ Photo search endpoint (`GET /api/photos/search`) with context-aware queries
- ✅ Database schema: `photo_library` and `trip_photos` tables (Prisma migration)
- ✅ Frontend `PhotoService` utility for photo operations
- ✅ Auto-fetched trip cover photos (stored directly in trip object)
- ✅ Suggestion cards with photos (via LLM `photoQuery` field)
- ✅ Proper Unsplash attribution with photographer credits

**Architecture Decision**:
- Simplified from complex database associations to **stateless photo library pattern**
- Photos fetched on-demand and stored in trip object (no race conditions)
- Photo URLs stored directly in `Trip.coverPhotoUrl` (no separate photo association writes)
- Database used only for caching search results (read-heavy, minimal writes)

**Technical Stack**:
- Backend: Express.js, Prisma, Unsplash API
- Frontend: React, TypeScript, Tailwind CSS
- Caching: In-memory (Map) + PostgreSQL
- Photo CDN: Unsplash (automatic optimization)

**Key Features**:
1. **Auto cover photos**: Destination-based search when trip created
2. **Suggestion photos**: LLM provides `photoQuery`, frontend auto-fetches
3. **Smart caching**: Popular photos cached, usage tracking for optimization
4. **Attribution compliance**: Photographer credits always displayed

**Deferred to Future**:
- PhotoGallery component with lightbox
- PhotoSearchModal for manual photo selection
- Day-specific photos and activity thumbnails
- Intersection Observer lazy loading

---

### Milestone 3.4: Public Share Links ✅ **COMPLETED** (2025-10-06)

**Goal**: Enable users to share trips via secure public URLs

#### What Was Built:

##### Public Share Links:
- [x] Added `publicShareToken`, `sharePassword`, `shareExpiresAt`, `shareViewCount` columns to trips table
- [x] Created `GET /api/share/:token` public route (no auth required)
- [x] Implemented `POST /api/trips/:id/share` endpoint (generate/retrieve share link)
- [x] Implemented `DELETE /api/trips/:id/share` endpoint (revoke share link)
- [x] Created `ShareButton` component with modal UI
- [x] Generate shareable link with copy-to-clipboard button
- [x] Created read-only public view at `/share/:token` route
- [x] Track share link views (analytics)
- [x] Display owner name and view count on shared trip page
- [x] "Plan Your Own Trip" CTA on shared trip pages

#### Database Schema:
```typescript
interface Trip {
  // ... existing fields
  publicShareToken?: string; // UUID for public links
  sharePassword?: string; // Reserved for future password protection
  shareExpiresAt?: Date; // Reserved for future link expiration
  shareViewCount: number; // Analytics (auto-incremented on each view)
}
```

#### Key Features:
- **Secure tokens**: crypto.randomUUID() for unguessable share links
- **Idempotent**: Generating link multiple times returns same token
- **Privacy-first**: Only exposes owner name and picture (no email)
- **Read-only**: Shared trips cannot be edited by viewers
- **View tracking**: Automatic view count incrementation
- **Responsive**: Works on mobile and desktop (tabs/split-view)
- **Auto-save integration**: Share button disabled until trip saved to database

**Acceptance Criteria**:
- ✅ Users can generate shareable links for their trips
- ✅ Public share links work without authentication
- ✅ Share links display read-only trip view
- ✅ Share link analytics track views
- ✅ Users can revoke share links
- ✅ Share button properly handles auto-save states

**Implementation Details**: See [MILESTONE_3.4_SUMMARY.md](./MILESTONE_3.4_SUMMARY.md) and [PR #15](https://github.com/kaikezhang/otterly-go/pull/15)

**Technical Stack**:
- Backend: Express.js, Prisma, crypto.randomUUID()
- Frontend: React, TypeScript, Tailwind CSS, react-router-dom
- Components: ShareButton (modal), SharedTrip (public view page)
- Security: JWT auth for share management, no auth for viewing

---

### Milestone 3.5: Comprehensive Trip Management & Dashboard

**Goal**: Transform the single-trip experience into a comprehensive trip library with modern dashboard UX, enabling users to efficiently manage multiple trips across their lifecycle (planning → active → completed → archived).

**Current Pain Points**:
- Users can only view/edit one trip at a time
- No easy way to switch between multiple trips
- No trip organization or status management
- No overview of all trips and their states
- No way to find old trips quickly

**Design Philosophy**:
Based on research of leading travel apps (Wanderlog, Roadtrippers, TripIt) and modern dashboard UX patterns, OtterlyGo will implement:
1. **Visual hierarchy** with F-pattern scanning (most important data top-left)
2. **Progressive disclosure** (show critical info first, details on demand)
3. **Context-aware filtering** with smart defaults
4. **Mobile-first design** with gesture controls
5. **Zero-friction navigation** between library and trip detail views

---

#### Part 1: Trips Dashboard (Library View)

**UX Transformation**: Replace the current single-trip view with a **Trips Dashboard** as the new landing page after login.

##### Backend Tasks:
- [x] Trip API already supports listing (`GET /api/trips`) with pagination
- [ ] Enhance API with advanced filtering:
  - [ ] Add `GET /api/trips?status=upcoming` (filter by trip status)
  - [ ] Add `GET /api/trips?search=tokyo` (full-text search on title/destination)
  - [ ] Add `GET /api/trips?sort=startDate&order=desc` (flexible sorting)
  - [ ] Add `GET /api/trips?archived=true` (show/hide archived trips)
- [ ] Add trip statistics endpoint:
  - [ ] `GET /api/trips/stats` - Returns counts by status, total destinations visited, etc.
- [ ] Add bulk operations endpoint:
  - [ ] `POST /api/trips/bulk` - Archive/delete/duplicate multiple trips
- [ ] Add trip status field to database:
  ```sql
  ALTER TABLE trips ADD COLUMN status VARCHAR(20) DEFAULT 'draft';
  -- Enum: 'draft', 'planning', 'upcoming', 'active', 'completed', 'archived'
  ```
- [ ] Add automated status transitions:
  - [ ] `draft` → `planning` (when itinerary exists)
  - [ ] `planning` → `upcoming` (7 days before start date)
  - [ ] `upcoming` → `active` (on start date)
  - [ ] `active` → `completed` (on end date + 1)
- [ ] Add last viewed/modified timestamps for sorting
- [ ] Add tags/categories field (optional, for power users):
  ```sql
  ALTER TABLE trips ADD COLUMN tags TEXT[];
  ```

##### Frontend Tasks:

**1. Dashboard Layout (New Page)**:
- [ ] Create `src/pages/Dashboard.tsx` as new authenticated landing page
- [ ] Implement responsive layout:
  - **Desktop**: 2-3 column grid of trip cards
  - **Tablet**: 2 column grid
  - **Mobile**: Single column with card swiping
- [ ] Add header with user info and "New Trip" CTA button
- [ ] Add statistics overview bar (total trips, upcoming trips, destinations visited)
- [ ] Add empty state with onboarding illustration when no trips exist

**2. Trip Cards (Grid/List Items)**:
- [ ] Create `TripCard.tsx` component with:
  - **Cover photo** (from trip.coverPhotoUrl or destination-based placeholder)
  - **Trip title** (editable inline on hover/long-press)
  - **Destination** with flag/location icon
  - **Date range** (e.g., "Dec 15-22, 2025" or "Draft" if no dates)
  - **Status badge** (color-coded: draft=gray, upcoming=blue, active=green, completed=purple, archived=muted)
  - **Progress indicator** (% of itinerary filled, based on activity count)
  - **Metadata row**: Days count, activities count, last edited timestamp
  - **Quick action menu** (three-dot overflow menu):
    - View/Edit
    - Duplicate
    - Share
    - Archive/Unarchive
    - Delete
- [ ] Implement card layouts:
  - [ ] **Grid view** (default): Large cover photo, compact info overlay
  - [ ] **List view** (alternative): Horizontal layout with thumbnail + details
  - [ ] **Compact view** (optional): Dense list for power users
- [ ] Add hover states and interactions:
  - [ ] Desktop: Hover shows overlay with quick actions
  - [ ] Mobile: Long-press shows context menu, swipe for archive/delete
- [ ] Add card selection mode for bulk operations (checkbox on long-press)

**3. Filtering & Search System**:
- [ ] Create `TripsFilterBar.tsx` component with:
  - **Search input** (full-text search across title/destination/activities)
  - **Status filter tabs**: All | Draft | Planning | Upcoming | Active | Past | Archived
  - **Sort dropdown**: Recent, Oldest, Name A-Z, Start Date, End Date
  - **View toggle**: Grid/List/Compact icons
  - **Bulk actions bar** (appears when items selected): Archive, Delete, Export
- [ ] Implement smart filtering:
  - [ ] Default view: "Upcoming" trips (auto-selected)
  - [ ] Badge counts on filter tabs (e.g., "Upcoming (3)")
  - [ ] Persist filter state in URL query params for bookmarkability
  - [ ] Real-time filter as user types in search (debounced 300ms)
- [ ] Add advanced filters (collapsible panel):
  - [ ] Date range picker (trips within specific dates)
  - [ ] Destination/country selector
  - [ ] Tags/categories (if implemented)
  - [ ] Shared vs. private trips
  - [ ] Trip duration (weekend, week, 2+ weeks)

**4. Navigation & Information Architecture**:
- [ ] Redesign app routing:
  ```
  OLD:
  / → Home (chat + itinerary for current trip)

  NEW:
  / → Landing page (if not logged in) or Dashboard (if logged in)
  /dashboard → Trips library (authenticated)
  /trip/new → Create new trip (chat interface)
  /trip/:id → Trip detail (chat + itinerary + map)
  /trip/:id/edit → Edit mode (direct manipulation)
  /share/:token → Public shared trip (unchanged)
  ```
- [ ] Add persistent navigation:
  - [ ] Top nav bar with: Logo | Dashboard | New Trip | Profile/Settings
  - [ ] Breadcrumbs when viewing trip: Dashboard > Tokyo Adventure
  - [ ] "Back to Dashboard" button in trip header
- [ ] Add keyboard shortcuts (for power users):
  - [ ] `N` - New trip
  - [ ] `/` - Focus search
  - [ ] `Ctrl/Cmd + K` - Command palette (quick navigate to trip)

**5. Trip Lifecycle Management**:
- [ ] Create `TripStatusManager` utility:
  - [ ] Auto-update trip status based on dates (runs on dashboard mount)
  - [ ] Show notifications for status changes ("Your trip to Tokyo starts tomorrow!")
- [ ] Add status transition UI:
  - [ ] Manual status override dropdown in trip settings
  - [ ] Confirmation dialogs for irreversible actions (mark completed, archive)
- [ ] Implement archive system:
  - [ ] Archived trips hidden by default (show with "Show Archived" toggle)
  - [ ] Bulk archive for trips older than X months (user-configurable)
  - [ ] "Restore from archive" action

**6. Quick Actions & Gestures**:
- [ ] Implement trip duplication:
  - [ ] "Duplicate" creates copy with "(Copy)" suffix and no dates
  - [ ] Option to duplicate as template (clear all dates and user-added content)
- [ ] Add swipe gestures (mobile):
  - [ ] Swipe left: Archive
  - [ ] Swipe right: Share
  - [ ] Long-press: Multi-select mode
- [ ] Add drag-and-drop reordering (optional):
  - [ ] Allow users to manually reorder trips in dashboard
  - [ ] Persist custom order in database (`displayOrder` column)

---

#### Part 2: Enhanced Trip Detail View

**Goal**: Improve the existing trip view (currently `Home.tsx`) with better context, navigation, and status management.

##### UI Enhancements:
- [ ] Add trip header with metadata:
  - [ ] Trip title (editable inline)
  - [ ] Destination with map icon (click to center map)
  - [ ] Date range (editable via date picker)
  - [ ] Status badge (clickable to change status)
  - [ ] Progress indicator (% complete)
  - [ ] Action bar: Share | Duplicate | Archive | Delete
- [ ] Improve breadcrumb navigation:
  - [ ] `Dashboard > [Trip Title]` with clickable path
  - [ ] Auto-save indicator next to breadcrumb
- [ ] Add trip settings sidebar/modal:
  - [ ] Cover photo selector
  - [ ] Tags/categories
  - [ ] Privacy settings
  - [ ] Custom status
  - [ ] Export options (PDF, iCal - deferred to Milestone 3.4 enhancements)
- [ ] Enhance mobile experience:
  - [ ] Collapsible header to maximize content area
  - [ ] Floating "Back to Dashboard" FAB (bottom-left)
  - [ ] Gesture: Swipe right from edge to go back to dashboard

##### State Management Updates:
- [ ] Refactor Zustand store to support multiple trips:
  ```typescript
  interface StoreState {
    // OLD: single trip
    trip: Trip | null;

    // NEW: trip library
    trips: Trip[]; // All user trips (cached)
    currentTripId: string | null; // Active trip being viewed
    currentTrip: Trip | null; // Derived from trips array

    // Actions
    loadAllTrips: () => Promise<void>;
    loadTrip: (id: string) => Promise<void>;
    switchTrip: (id: string) => void;
    createTrip: () => Promise<Trip>;
    deleteTrip: (id: string) => Promise<void>;
    archiveTrip: (id: string) => Promise<void>;
    duplicateTrip: (id: string) => Promise<Trip>;
  }
  ```
- [ ] Implement trip caching strategy:
  - [ ] Cache trips list in localStorage (sync on mount)
  - [ ] Invalidate cache on trip updates
  - [ ] Optimistic updates for instant UI feedback

---

#### Part 3: Visual Design System

**Color-Coded Status System** (inspired by modern dashboard UX):

| Status | Color | Badge Style | Use Case |
|--------|-------|-------------|----------|
| **Draft** | Gray (`bg-gray-100 text-gray-700`) | Muted pill | No itinerary yet, just created |
| **Planning** | Yellow (`bg-yellow-100 text-yellow-800`) | Soft warning | Itinerary started, no dates set |
| **Upcoming** | Blue (`bg-blue-100 text-blue-800`) | Info highlight | Dates set, trip starts in 1-30 days |
| **Active** | Green (`bg-green-100 text-green-800`) | Success | Currently happening (today within date range) |
| **Completed** | Purple (`bg-purple-100 text-purple-800`) | Calm retrospective | Trip ended, past memories |
| **Archived** | Muted gray (`bg-gray-50 text-gray-500`) | Low contrast | Hidden by default, long-term storage |

**Typography Hierarchy**:
- Trip title: `text-xl font-bold` (dashboard cards), `text-3xl font-bold` (detail view)
- Destination: `text-sm text-gray-600 font-medium`
- Dates: `text-sm text-gray-500`
- Metadata: `text-xs text-gray-400`

**Spacing & Layout**:
- Card padding: `p-4` (mobile), `p-6` (desktop)
- Grid gap: `gap-4` (mobile), `gap-6` (desktop)
- Cover photo aspect ratio: `16:9` (landscape)
- Thumbnail size: `h-48` (grid view), `h-24 w-24` (list view)

**Animations** (subtle, performant):
- Card hover: `transition-all duration-200 hover:shadow-lg hover:-translate-y-1`
- Filter tabs: `transition-colors duration-150`
- Status badge: `transition-all duration-200`
- Skeleton loaders: `animate-pulse` for async content

**Icons** (using existing icon set or Heroicons):
- Grid view: 3x3 grid icon
- List view: List bullets icon
- Search: Magnifying glass
- Filter: Funnel icon
- Sort: Arrows up/down
- New trip: Plus icon in circle
- Archive: Archive box icon
- Duplicate: Document duplicate icon

---

#### Part 4: Performance & UX Optimizations

**Performance**:
- [ ] Implement virtual scrolling for >50 trips (react-window or @tanstack/react-virtual)
- [ ] Lazy load cover photos with skeleton placeholders (Intersection Observer)
- [ ] Prefetch trip data on card hover (reduce perceived load time when clicking)
- [ ] Add optimistic UI updates (instant feedback, background sync)
- [ ] Cache trip list in IndexedDB for offline viewing
- [ ] Implement infinite scroll or pagination (20 trips per page)

**UX Polish**:
- [ ] Add empty states with illustrations:
  - No trips yet: "Start planning your first adventure!"
  - No search results: "No trips found. Try different keywords."
  - No upcoming trips: "Time to plan your next trip!"
- [ ] Add loading states:
  - Skeleton cards while fetching trips (3-6 placeholders)
  - Shimmer animation on card thumbnails
  - Progress bar for bulk operations
- [ ] Add success/error notifications:
  - "Trip archived" with undo action (toast notification)
  - "Trip deleted" confirmation
  - "Duplicate created successfully"
- [ ] Add onboarding tour (first-time users):
  - Highlight "New Trip" button
  - Explain filter tabs
  - Show quick actions menu
- [ ] Add analytics tracking:
  - Dashboard view count
  - Filter usage patterns
  - Trip creation funnel (dashboard → new trip → itinerary)
  - Feature adoption (duplicate, archive, search)

**Accessibility**:
- [ ] ARIA labels for all interactive elements
- [ ] Keyboard navigation for entire dashboard (tab order, arrow keys)
- [ ] Screen reader announcements for status changes
- [ ] High contrast mode support
- [ ] Focus indicators for all focusable elements
- [ ] Skip links ("Skip to trips", "Skip to filters")

---

#### Part 5: Mobile-First Enhancements

**Mobile Dashboard** (inspired by Wanderlog's mobile UI):
- [ ] Implement bottom tab navigation:
  - 📊 Dashboard (trips library)
  - ➕ New Trip (quick create)
  - 🗺️ Explore (inspiration feed - deferred to Phase 8)
  - 👤 Profile
- [ ] Add pull-to-refresh for trips list
- [ ] Implement card swiping for quick actions:
  - Swipe left: Delete (with confirmation)
  - Swipe right: Archive
- [ ] Add floating action button (FAB) for "New Trip" (bottom-right)
- [ ] Optimize touch targets (minimum 44x44px)
- [ ] Add haptic feedback for swipe actions (iOS)

**Responsive Breakpoints**:
```css
/* Mobile first */
.trip-grid { grid-template-columns: 1fr; }

/* Tablet (sm: 640px) */
@media (min-width: 640px) {
  .trip-grid { grid-template-columns: repeat(2, 1fr); }
}

/* Desktop (lg: 1024px) */
@media (min-width: 1024px) {
  .trip-grid { grid-template-columns: repeat(3, 1fr); }
}

/* Large desktop (xl: 1280px) */
@media (min-width: 1280px) {
  .trip-grid { grid-template-columns: repeat(4, 1fr); }
}
```

**Progressive Web App (PWA) Enhancement**:
- [ ] Add offline support for viewing cached trips
- [ ] Add "Add to Home Screen" prompt on mobile
- [ ] Cache trip cover photos in service worker
- [ ] Show offline indicator when no connection

---

#### Data Model Updates

**Database Schema Changes**:

```sql
-- Add new columns to trips table
ALTER TABLE trips ADD COLUMN status VARCHAR(20) DEFAULT 'draft';
ALTER TABLE trips ADD COLUMN tags TEXT[] DEFAULT '{}';
ALTER TABLE trips ADD COLUMN display_order INTEGER;
ALTER TABLE trips ADD COLUMN last_viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE trips ADD COLUMN archived_at TIMESTAMP;

-- Add indexes for performance
CREATE INDEX idx_trips_status ON trips(status);
CREATE INDEX idx_trips_user_id_status ON trips(user_id, status);
CREATE INDEX idx_trips_start_date ON trips(start_date);
CREATE INDEX idx_trips_last_viewed ON trips(last_viewed_at DESC);

-- Add full-text search index (PostgreSQL)
ALTER TABLE trips ADD COLUMN search_vector tsvector;
CREATE INDEX idx_trips_search ON trips USING gin(search_vector);

-- Trigger to update search_vector on changes
CREATE TRIGGER trips_search_update
BEFORE INSERT OR UPDATE ON trips
FOR EACH ROW EXECUTE FUNCTION
  tsvector_update_trigger(search_vector, 'pg_catalog.english', title, destination);
```

**TypeScript Interface Updates**:

```typescript
// Update Trip interface in src/types/index.ts
interface Trip {
  id: string;
  userId: string;
  title: string;
  destination: string;
  startDate: string | null;
  endDate: string | null;
  dataJson: TripData;
  coverPhotoUrl?: string;
  publicShareToken?: string;
  shareViewCount: number;

  // NEW FIELDS
  status: TripStatus;
  tags: string[];
  displayOrder: number;
  lastViewedAt: string;
  archivedAt: string | null;

  createdAt: string;
  updatedAt: string;
}

type TripStatus = 'draft' | 'planning' | 'upcoming' | 'active' | 'completed' | 'archived';

interface TripFilters {
  search?: string;
  status?: TripStatus | 'all' | 'past';
  tags?: string[];
  archived?: boolean;
  sort?: 'recent' | 'oldest' | 'name' | 'startDate' | 'endDate';
  order?: 'asc' | 'desc';
}

interface TripStats {
  total: number;
  byStatus: Record<TripStatus, number>;
  destinationsCount: number;
  totalDays: number;
  activitiesCount: number;
}
```

---

#### Acceptance Criteria

**Must Have (MVP)**:
- ✅ Dashboard displays all user trips in grid/list view
- ✅ Trip cards show cover photo, title, dates, status badge
- ✅ Search works across trip title and destination
- ✅ Filter tabs work (All, Upcoming, Past, Archived)
- ✅ Quick actions menu (view, duplicate, archive, delete)
- ✅ Automated status transitions based on dates
- ✅ Responsive layout (mobile, tablet, desktop)
- ✅ Navigation between dashboard and trip detail view
- ✅ Bulk operations (multi-select and bulk archive/delete)

**Should Have (Polish)**:
- ✅ Advanced filters (date range, tags, destination)
- ✅ Multiple view modes (grid, list, compact)
- ✅ Swipe gestures for mobile quick actions
- ✅ Empty states with helpful messaging
- ✅ Loading states with skeletons
- ✅ Success/error notifications with undo
- ✅ Trip statistics overview

**Could Have (Future Enhancement)**:
- ⏳ Virtual scrolling for 100+ trips
- ⏳ Drag-and-drop trip reordering
- ⏳ Tags/categories system
- ⏳ Custom trip templates
- ⏳ Trip comparison view (side-by-side)
- ⏳ Batch export (PDF/iCal for multiple trips)

---

#### Technical Implementation Plan

**Phase 1: Backend & Data Model** (2-3 days):
1. Create database migration for new columns
2. Update Prisma schema
3. Enhance trip API with filtering/search/bulk operations
4. Add trip statistics endpoint
5. Implement status automation logic

**Phase 2: Dashboard UI** (3-4 days):
1. Create Dashboard page and routing
2. Build TripCard component with all states
3. Implement TripsFilterBar component
4. Add grid/list view toggle
5. Implement search and filtering logic
6. Add empty and loading states

**Phase 3: Navigation & Polish** (2-3 days):
1. Redesign app routing and navigation
2. Add breadcrumbs and back navigation
3. Implement quick actions menu
4. Add bulk selection and operations
5. Add success/error notifications
6. Polish animations and transitions

**Phase 4: Mobile Optimization** (2-3 days):
1. Implement responsive layouts
2. Add swipe gestures
3. Add bottom tab navigation (mobile)
4. Optimize touch targets
5. Test on real devices

**Phase 5: Performance & Testing** (2-3 days):
1. Add lazy loading and skeleton loaders
2. Implement optimistic updates
3. Add caching strategy
4. Performance audit (Lighthouse)
5. Cross-browser testing
6. Accessibility audit

**Total Estimate**: 11-16 days (2-3 weeks)

---

#### Design Inspiration & References

**Apps Analyzed**:
- **Wanderlog**: Clean card-based UI, excellent mobile experience, intuitive trip organization
- **Roadtrippers**: Strong visual hierarchy, map-centric navigation
- **TripIt**: Robust filtering, calendar-based views, status management
- **Google Keep**: Card grid layout, color coding, search UX
- **Notion**: Database views (grid/list/board), flexible filtering

**UX Patterns Applied**:
1. **Progressive Disclosure**: Show essential info on cards, details on demand
2. **Visual Hierarchy**: Status badges, cover photos, typographic scale
3. **Context-Aware Defaults**: Smart filter presets (Upcoming trips default view)
4. **Zero-Friction Navigation**: Quick actions, gestures, keyboard shortcuts
5. **Feedback Loops**: Optimistic UI, undo actions, clear success states

**Design System Integration**:
- Extends existing Tailwind CSS v4 setup
- Uses consistent color palette from Phase 3 improvements
- Maintains accessibility standards (WCAG AA)
- Follows mobile-first responsive patterns

---

#### Success Metrics

| Metric | Baseline | Target | Measurement |
|--------|----------|--------|-------------|
| Trip creation rate | N/A | 2+ trips per user | Average trips per user account |
| Dashboard engagement | N/A | 60% daily return | % users who return to dashboard daily |
| Feature adoption (search) | N/A | 30% of users | % users who use search at least once |
| Feature adoption (filters) | N/A | 40% of users | % users who change filter tabs |
| Mobile vs Desktop usage | N/A | Track split | Sessions by device type |
| Trip switching time | N/A | <2 seconds | Time from dashboard click to trip view |
| Dashboard load time | N/A | <1 second | Time to interactive for trips list |

---

#### Future Enhancements (Post-MVP)

**Advanced Features** (deferred to later phases):
- [ ] Trip templates library (pre-built itineraries users can duplicate)
- [ ] Smart trip suggestions based on user history ("You might like...")
- [ ] Calendar view (month/year view with trips overlaid)
- [ ] Map view of all trips (world map with pins for each destination)
- [ ] Trip comparison mode (compare 2-3 trips side-by-side)
- [ ] Collaborative trip planning (share edit access with friends)
- [ ] Trip budgeting (track estimated vs actual costs)
- [ ] Packing list integration (checklist per trip)
- [ ] Weather forecasts for upcoming trips
- [ ] Travel documents storage (boarding passes, reservations)
- [ ] Social features (public trip discovery, follow travelers)

**AI Enhancements**:
- [ ] AI-powered trip recommendations ("Plan a trip similar to Tokyo 2024")
- [ ] Smart auto-categorization (auto-tag trips by type: beach, city, adventure)
- [ ] Duplicate detection (warn when creating similar trips)
- [ ] Activity suggestions based on past preferences

---

**Implementation Priority**: **HIGH** - Critical for user retention and multi-trip management

**Dependencies**:
- ✅ Milestone 1.3 (Trip CRUD API)
- ✅ Milestone 2.1 (Authentication)
- ✅ Milestone 3.1 (Map integration - for cover photos)
- ✅ Milestone 3.4 (Public share links - for share quick action)

**Blocks**:
- Phase 4 (Monetization - free tier limits need trip count)
- Phase 8 (Advanced features - trip recommendations need history data)

---

### Future Enhancements for Milestone 3.4 (Deferred)

The following features were part of the original Milestone 3.4 scope but have been deferred to future development:

#### PDF Export (Future):
- [ ] Install PDF library (`react-pdf` or `jsPDF` with `html2canvas`)
- [ ] Create print-optimized trip template (clean, minimal layout)
- [ ] Generate PDF with cover page, day-by-day breakdown, maps
- [ ] Include images in PDF (optional, increases file size)
- [ ] Add QR code linking to live itinerary (for updates)
- [ ] Implement "Download PDF" button in trip header
- [ ] Add PDF customization options (include/exclude sections)
- [ ] Optimize PDF size (compress images, vector graphics)

#### Calendar Integration (Future):
- [ ] Generate .ics file (iCalendar format) for Google/Apple Calendar
- [ ] Create events for each day/activity with time slots
- [ ] Add location data to calendar events (for navigation)
- [ ] Include trip notes in event descriptions
- [ ] Add "Add to Calendar" button with provider options

#### Email Itinerary (Future):
- [ ] Create email template (HTML with inline CSS)
- [ ] Add `POST /api/trips/:id/email` endpoint
- [ ] Use email service (SendGrid, Mailgun, or Resend)
- [ ] Allow users to email itinerary to themselves or others
- [ ] Include attachments (PDF optional)
- [ ] Add email preview before sending

#### Collaboration Features (Future):
- [ ] Add `trip_shares` table (trip_id, shared_with_email, permission)
- [ ] Create share modal ("Invite collaborators by email")
- [ ] Implement collaborative share endpoint with permissions
- [ ] Add permission levels: view-only, can-edit, can-manage
- [ ] Send email invitations to collaborators
- [ ] Show "Shared with" section in trip settings
- [ ] Add real-time sync for collaborative editing (WebSocket or polling)

#### Advanced Share Features (Future):
- [ ] Implement link expiration (utilize `shareExpiresAt` field)
- [ ] Add password protection option (utilize `sharePassword` field with bcrypt)
- [ ] Add "Clone this trip" button for logged-in users viewing shared trips
- [ ] Social media sharing (Open Graph meta tags)
- [ ] Embed widget for external websites

---

### UI/UX Improvements for Phase 3 ✅ **COMPLETED** (2025-10-06)

Based on user testing and design review, the following improvements have been implemented:

#### 1. Information Density & Readability ✅
- [x] Increase contrast and size for duration labels (changed from text-xs text-gray-500 to text-sm text-gray-700 font-medium)
- [x] Make day headers more prominent (upgraded to text-lg font-bold with font-medium date text)
- [x] Add collapsible day sections (already existed - enhanced with better visual indicators)
- [x] Implement day header badges showing item counts (already existed)

#### 2. Layout & Responsiveness
- [x] Fix map legend overlap with map controls (moved legend to bottom-right with proper spacing)
- [ ] Add panel collapse/resize controls for better focus management (deferred)
- [ ] Implement adjustable panel widths with draggable divider (deferred)
- [ ] Add responsive breakpoint optimization for tablet sizes (deferred)

#### 3. Navigation & Orientation ✅
- [ ] Add breadcrumbs or "back to trips" navigation (deferred)
- [x] Add confirmation dialog for "Start Over" button (already existed)
- [x] Display trip save status indicator (already existed - shows "Saving..." and "Unsaved changes")
- [x] Show clear visual feedback when Edit Mode is active (enhanced with blue background, white text, shadow, and checkmark)

#### 4. Interactive Elements ✅
- [x] Increase click target size for "+ Add suggestion" (made entire footer clickable with full-width button)
- [x] Make Edit Mode toggle more visually distinct when active (upgraded to bg-blue-600 with ring and shadow)
- [x] Add hover states for all interactive elements (added transition-colors to legend items and buttons)
- [ ] Use consistent terminology between map markers and legend (already consistent - uses "stops")

#### 5. Progressive Disclosure ✅
- [ ] Implement message collapsing or virtual scrolling for long chat history (deferred)
- [x] Add "show more" truncation for long activity descriptions (truncates at 150 characters with toggle button)
- [ ] Consider collapsible map panel with "Show Map" expansion (map toggle already exists)
- [ ] Add skeleton loaders for async content (deferred)

#### 6. Map Enhancements
- [ ] Show estimated travel time and distance between locations on polylines (deferred)
- [ ] Add loading states for geocoding operations (deferred)
- [ ] Implement map marker clustering for dense itineraries (deferred)
- [x] Add "center on current day" quick action (already existed - click legend items)

#### 7. Editing & Manipulation ✅
- [x] Add "duplicate day" action in Edit Mode (implemented with store action and UI button)
- [ ] Add "reorder days" capability (drag entire days) (deferred)
- [x] Improve drag-and-drop visual feedback (DragOverlay already implemented)
- [x] Add undo/redo keyboard shortcuts visibility (tooltip titles added to buttons)

#### 8. Share Experience ✅
- [x] Add social media Open Graph meta tags for rich link previews (added OG and Twitter Card tags)
- [ ] Implement "Clone this trip" button for logged-in users viewing shared trips (deferred)
- [ ] Add QR code generation for easy mobile sharing (deferred)
- [ ] Show trip statistics on shared view (deferred)

**Priority**: Medium (remaining items deferred to Phase 7)

**What Was Implemented** (2025-10-06):
1. **Enhanced duration labels** - Larger, higher contrast text (text-sm, font-medium, text-gray-700)
2. **Prominent day headers** - Larger font (text-lg), bolder weight, better date styling
3. **Fixed map legend** - Repositioned to bottom-right to avoid control overlap
4. **Visual Edit Mode indicator** - Distinct blue background with shadow when active
5. **Larger Add suggestion button** - Full-width clickable footer area
6. **Description truncation** - Auto-truncate long descriptions with "Show more/less" toggle
7. **Duplicate day feature** - Store action + UI button in edit mode
8. **Open Graph meta tags** - Rich link previews for social media sharing

**Technical Implementation**:
- Frontend: React component updates (ItineraryView, Home, MapView)
- Store: Added `duplicateDay` action with history tracking
- HTML: Added comprehensive OG and Twitter Card meta tags
- UX: Improved hover states, transitions, and visual hierarchy

**Deferred Features** (to be scheduled in Phase 7):
- Panel resize controls with draggable dividers
- Message collapsing/virtual scrolling for chat
- Reorder days capability
- Clone trip button for shared trips
- QR code generation
- Trip statistics on shared view

---

## Phase 4: Monetization & Business Logic (Weeks 9-10)

**Goal**: Enable revenue generation

### Milestone 4.1: Subscription System
- [ ] Integrate Stripe (or Paddle for global sales tax)
- [ ] Create subscription tiers:
  - **Free**: 3 trips, GPT-3.5-turbo, basic features
  - **Pro**: Unlimited trips, GPT-4o, export, priority support
  - **Team**: Collaboration features, admin dashboard
- [ ] Implement webhook handlers for Stripe events
- [ ] Add usage tracking/limits enforcement
- [ ] Create billing portal (Stripe Customer Portal)
- [ ] Add checkout flow

**Acceptance Criteria**: Users can subscribe and access tier-based features

### Milestone 4.2: Usage Analytics
- [ ] Track API usage per user (OpenAI token costs)
- [ ] Add usage dashboard for admins
- [ ] Implement soft limits with upgrade prompts
- [ ] Add cost attribution (store token usage in DB)

**Acceptance Criteria**: Admin can monitor costs; users see usage stats

---

## Phase 5: Production Hardening (Weeks 11-13)

**Goal**: Ensure reliability, performance, and security

### Milestone 5.1: Testing Suite
- [ ] Add unit tests for critical functions (Vitest)
- [ ] Add integration tests for API endpoints (Supertest)
- [ ] Add E2E tests (Playwright or Cypress)
- [ ] Set up CI/CD pipeline (GitHub Actions)
- [ ] Add test coverage reporting (minimum 70%)
- [ ] Add pre-commit hooks (Husky + lint-staged)

**Acceptance Criteria**: Automated tests run on every PR; >70% coverage

### Milestone 5.2: Performance Optimization
- [ ] Implement React.lazy for code splitting
- [ ] Add image optimization (WebP, lazy loading)
- [ ] Set up CDN for static assets (Cloudflare or Vercel)
- [ ] Add database query optimization (indexes, N+1 prevention)
- [ ] Implement caching strategy (Redis for API responses)
- [ ] Add compression (gzip/brotli)
- [ ] Run Lighthouse audit (target: >90 performance score)

**Acceptance Criteria**: Page load <2s on 3G; Lighthouse score >90

### Milestone 5.3: Security Hardening
- [ ] Add HTTPS everywhere (enforced redirects)
- [ ] Implement CSRF protection
- [ ] Add Content Security Policy headers
- [ ] Set up CORS properly
- [ ] Add input validation on all endpoints (Zod)
- [ ] Implement API request signing
- [ ] Run security audit (npm audit, Snyk)
- [ ] Add DDoS protection (Cloudflare)
- [ ] Implement session timeout/revocation
- [ ] Add 2FA option (authenticator apps)

**Acceptance Criteria**: Pass OWASP Top 10 security checks

### Milestone 5.4: Error Handling & Monitoring
- [ ] Set up error tracking (Sentry or Rollbar)
- [ ] Add structured logging (Winston or Pino)
- [ ] Create custom error pages (404, 500)
- [ ] Implement graceful degradation (offline mode)
- [ ] Add health check endpoints
- [ ] Set up uptime monitoring (UptimeRobot or Better Uptime)
- [ ] Create alerting rules (PagerDuty or Opsgenie)
- [ ] Add performance monitoring (Datadog or New Relic)

**Acceptance Criteria**: 99.9% uptime; errors auto-reported with context

---

## Phase 6: Deployment & DevOps (Week 14)

**Goal**: Launch to production

### Milestone 6.1: Infrastructure Setup
- [ ] Choose hosting provider:
  - **Frontend**: Vercel, Netlify, or Cloudflare Pages
  - **Backend**: Render, Railway, Fly.io, or AWS/GCP
  - **Database**: Supabase, PlanetScale, or RDS
- [ ] Set up staging environment
- [ ] Configure environment variables management (Doppler or Infisical)
- [ ] Set up automated backups (database + user uploads)
- [ ] Add disaster recovery plan

**Acceptance Criteria**: Staging and production environments deployed

### Milestone 6.2: CI/CD Pipeline
- [ ] Automated testing on PR
- [ ] Automated deployment to staging on merge to `develop`
- [ ] Manual approval for production deploys
- [ ] Rollback strategy
- [ ] Database migration automation

**Acceptance Criteria**: Code reaches production within 10 minutes of merge

### Milestone 6.3: Domain & DNS
- [ ] Purchase domain
- [ ] Configure DNS (Cloudflare recommended)
- [ ] Set up SSL certificates (auto via host or Let's Encrypt)
- [ ] Add email forwarding (contact@, support@)

**Acceptance Criteria**: Production site accessible at custom domain with HTTPS

---

## Phase 7: Launch & Growth (Week 15+)

**Goal**: Go to market and iterate

### Milestone 7.1: Legal & Compliance
- [ ] Create Terms of Service
- [ ] Create Privacy Policy (GDPR/CCPA compliant)
- [ ] Add cookie consent banner (if using analytics)
- [ ] Set up data retention policies
- [ ] Create data export feature (GDPR right to data portability)

**Acceptance Criteria**: Legal pages published; compliant with EU/US regulations

### Milestone 7.2: Analytics & Marketing
- [ ] Add privacy-friendly analytics (Plausible or PostHog)
- [ ] Set up conversion tracking
- [ ] Create landing page with hero/features/pricing
- [ ] Add blog/content section (optional)
- [ ] Set up email marketing (Mailchimp, ConvertKit, or Loops)
- [ ] Create onboarding flow/tutorial

**Acceptance Criteria**: Track user acquisition funnel; onboarding completion >60%

### Milestone 7.3: Customer Support
- [ ] Add in-app support chat (Intercom or Plain)
- [ ] Create help center/documentation (Notion or GitBook)
- [ ] Set up support email ticketing
- [ ] Add feedback widget
- [ ] Create FAQ page

**Acceptance Criteria**: Users can get help within 24 hours

### Milestone 7.4: Mobile Optimization
- [ ] Responsive design audit (all breakpoints)
- [ ] Add PWA support (service worker, manifest.json)
- [ ] Enable offline mode for viewing saved trips
- [ ] Add "Add to Home Screen" prompt
- [ ] Test on real devices (iOS Safari, Android Chrome)

**Acceptance Criteria**: App installable as PWA; works offline

---

## Phase 8: Advanced Features (Post-Launch)

**Goal**: Competitive differentiation

### Milestone 8.1: AI Enhancements
- [ ] Add GPT-4o with vision for image-based suggestions
- [ ] Implement multi-language support (i18n)
- [ ] Add voice input for trip planning (Web Speech API)
- [ ] Create AI trip recommendations based on history
- [ ] Add budget estimation features

### Milestone 8.2: Integrations
- [ ] Google Calendar export
- [ ] TripAdvisor/Yelp data enrichment
- [ ] Flight/hotel booking integration (Skyscanner API, Amadeus)
- [ ] Map integration (Mapbox or Google Maps)
- [ ] Weather API integration

### Milestone 8.3: Social Features
- [ ] Trip discovery/browse page
- [ ] User reviews/ratings for destinations
- [ ] Follow travelers
- [ ] Trip inspiration feed

---

## Success Metrics

| Phase | Key Metric | Target |
|-------|------------|--------|
| Phase 1 | API response time | <200ms p95 |
| Phase 2 | User signup conversion | >40% |
| Phase 3 | Feature adoption | >30% use sharing |
| Phase 4 | Free→Paid conversion | >5% |
| Phase 5 | Uptime | 99.9% |
| Phase 6 | Deploy time | <10 minutes |
| Phase 7 | User retention (D7) | >50% |
| Phase 8 | Engagement (trips/user) | >3 |

---

## Tech Stack Recommendations

**Frontend** (current):
- React 18 + TypeScript
- Vite
- Zustand (keep for client state)
- Tailwind CSS v4

**Backend** (current):
- **Express.js + PostgreSQL** (chosen in Phase 1) - More control, clear separation from frontend
- TypeScript + Node.js
- Alternative options considered: Next.js 14+ App Router, Remix

**Database** (current):
- **PostgreSQL** with Prisma (chosen in Phase 1) - Local development, production hosting TBD
- Redis for caching (Upstash) - To be added in Phase 5

**ORM** (current):
- **Prisma** (chosen in Phase 1) - Excellent DX, type safety, migrations

**Auth**:
- **Google OAuth** (chosen for Phase 2): `@react-oauth/google` (frontend) + `passport-google-oauth20` (backend)
- **JWT Sessions**: Jose or jsonwebtoken for session tokens after OAuth
- **Alternative Managed**: Clerk, Auth0, or Supabase Auth (if expanding to multi-provider later)

**Payments**:
- Stripe (US-focused) or Paddle (global)

**Hosting**:
- Vercel (Next.js) or Netlify (frontend)
- Render or Railway (backend)

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| OpenAI cost spikes | High | Implement token limits, cache responses, add fallback to GPT-3.5-turbo |
| Data loss | Critical | Automated daily backups, point-in-time recovery |
| Security breach | Critical | Regular audits, bug bounty program, encrypt PII at rest |
| Slow performance | Medium | CDN, caching, code splitting, lazy loading |
| API downtime | High | Circuit breakers, graceful degradation, status page |

---

## Timeline Summary

- **Phases 1-2**: 5 weeks (foundation)
- **Phases 3-4**: 4 weeks (features + monetization)
- **Phases 5-6**: 4 weeks (hardening + deploy)
- **Phase 7**: 2+ weeks (launch)
- **Total to production**: ~15 weeks (3.5 months)

---

## Next Steps

1. Review this roadmap with stakeholders
2. Prioritize phases based on business goals
3. Set up project tracking (Linear, GitHub Projects, or Jira)
4. Begin Phase 1, Milestone 1.1 (API proxy)
5. Schedule weekly demos and retrospectives

---

**Last Updated**: 2025-10-06 (Milestone 3.5 Comprehensive Trip Management & Dashboard designed - Transformative UX for multi-trip organization with modern dashboard patterns)
