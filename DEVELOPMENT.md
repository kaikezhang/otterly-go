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

### Milestone 1.2: Database Setup
- [ ] Choose database (PostgreSQL recommended for relational trip data)
- [ ] Set up database hosting (Supabase, Railway, or Render)
- [ ] Design schema:
  - `users` table (id, email, password_hash, created_at, subscription_tier)
  - `trips` table (id, user_id, title, destination, start_date, end_date, data_json, created_at, updated_at)
  - `conversations` table (id, trip_id, messages_json, created_at, updated_at)
- [ ] Set up migrations (Prisma or Drizzle ORM recommended)
- [ ] Add database connection pooling

**Acceptance Criteria**: Database schema deployed and accessible from backend

### Milestone 1.3: Trip CRUD API
- [ ] Implement `POST /api/trips` (create trip)
- [ ] Implement `GET /api/trips` (list user's trips)
- [ ] Implement `GET /api/trips/:id` (get single trip)
- [ ] Implement `PATCH /api/trips/:id` (update trip)
- [ ] Implement `DELETE /api/trips/:id` (delete trip)
- [ ] Add pagination for trip lists
- [ ] Replace localStorage with API calls in frontend

**Acceptance Criteria**: Trips persist to database and sync across browser sessions

---

## Phase 2: Authentication & User Management (Weeks 4-5)

**Goal**: Enable secure multi-user access

### Milestone 2.1: Authentication System
- [ ] Implement user registration (`POST /api/auth/register`)
- [ ] Implement login (`POST /api/auth/login`) with JWT tokens
- [ ] Add password hashing (bcrypt)
- [ ] Create protected route middleware
- [ ] Implement token refresh mechanism
- [ ] Add email verification flow (SendGrid or Resend)
- [ ] Add password reset functionality

**Acceptance Criteria**: Users can register, login, and access only their own trips

### Milestone 2.2: Frontend Auth Integration
- [ ] Create login/register pages
- [ ] Add auth context provider (React Context or Zustand slice)
- [ ] Store JWT in httpOnly cookies (not localStorage for security)
- [ ] Add route guards for authenticated pages
- [ ] Create logout functionality
- [ ] Add "Remember me" option
- [ ] Handle token expiration gracefully

**Acceptance Criteria**: Unauthenticated users redirected to login; authenticated users see personalized dashboard

### Milestone 2.3: User Profile & Settings
- [ ] Create user profile page
- [ ] Allow email/password updates
- [ ] Add profile picture upload (Cloudinary or S3)
- [ ] Create account deletion flow
- [ ] Add notification preferences

**Acceptance Criteria**: Users can manage their account settings

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

**Backend** (to add):
- **Option A**: Next.js 14+ (App Router) - all-in-one solution
- **Option B**: Express.js + PostgreSQL - more control
- **Option C**: Remix - excellent UX patterns

**Database**:
- PostgreSQL (Supabase or PlanetScale)
- Redis for caching (Upstash)

**ORM**:
- Prisma (DX-focused) or Drizzle (lightweight)

**Auth**:
- **DIY**: Jose (JWT) + bcrypt
- **Managed**: Clerk, Auth0, or Supabase Auth

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

**Last Updated**: 2025-10-06
