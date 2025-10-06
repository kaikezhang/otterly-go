# OtterlyGo Development Roadmap

This document outlines the milestones for transforming OtterlyGo from MVP to production-ready SaaS.

## Current State (MVP)

- ✅ Client-side React app with Zustand state management
- ✅ OpenAI GPT-3.5-turbo integration for trip planning
- ✅ localStorage persistence
- ✅ Structured JSON conversation engine
- ⚠️ Browser-exposed API keys (`dangerouslyAllowBrowser: true`)
- ⚠️ No user authentication
- ⚠️ No backend infrastructure
- ⚠️ No multi-user support

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

### Milestone 2.3: User Profile & Settings
- [ ] Create user profile page (display Google info: name, email, avatar)
- [ ] Allow name updates (override Google name if desired)
- [ ] Allow profile picture override (Cloudinary or S3) or use Google avatar
- [ ] Create account deletion flow (delete user + all trips + conversations)
- [ ] Add notification preferences (email notifications for trip reminders, etc.)
- [ ] Add privacy settings (public profile visibility for future social features)
- [ ] Display connected Google account info
- [ ] Add "Disconnect Google" option (if supporting multiple auth providers later)

**Acceptance Criteria**: Users can view and manage their account settings

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

## Phase 3: Enhanced Features (Weeks 6-8)

**Goal**: Add production-grade features

### Milestone 3.1: Trip Sharing & Collaboration
- [ ] Add `trip_shares` table (trip_id, shared_with_user_id, permission_level)
- [ ] Implement share trip endpoint (`POST /api/trips/:id/share`)
- [ ] Add read-only vs. edit permissions
- [ ] Create shareable public links (optional, with `public_share_token` column)
- [ ] Add UI for managing collaborators

**Acceptance Criteria**: Users can share trips with others via email or public link

### Milestone 3.2: Export & Print
- [ ] Generate PDF itineraries (using react-pdf or Puppeteer)
- [ ] Add CSV export for expenses (future feature)
- [ ] Create print-optimized view
- [ ] Add "Email itinerary" feature

**Acceptance Criteria**: Users can download/print their trips

### Milestone 3.3: Search & Filtering
- [ ] Add full-text search on trips (PostgreSQL `tsvector` or Algolia)
- [ ] Implement filters (destination, date range, tags)
- [ ] Add trip templates/favorites
- [ ] Create archive functionality

**Acceptance Criteria**: Users can quickly find trips in large collections

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

**Last Updated**: 2025-10-06 (Milestone 2.4 added)
