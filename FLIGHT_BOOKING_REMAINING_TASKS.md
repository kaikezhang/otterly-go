# Flight Booking - Remaining Implementation Tasks

**Status as of PR #44**: Frontend UI components completed, backend infrastructure complete (PR #43)

This document tracks remaining work from the original [FLIGHT_BOOKING_PLAN.md](./FLIGHT_BOOKING_PLAN.md).

---

## ✅ Completed Work

### Backend Infrastructure (PR #43)
- ✅ Database schema (FlightSearch, FlightBooking, PriceAlert tables)
- ✅ Duffel API provider integration with mock data fallback
- ✅ Flight aggregator service with caching
- ✅ Booking API endpoints (`/api/booking/search`, `/api/booking/create`, etc.)
- ✅ Multi-provider abstraction layer

### Frontend UI Components (PR #44)
- ✅ FlightSearchForm with intelligent pre-population
- ✅ FlightCard for displaying flight options
- ✅ FlightDetailsModal for detailed flight information
- ✅ BookingForm for passenger data collection
- ✅ BookingConfirmation for booking success
- ✅ Booking state management in Zustand store
- ✅ Agent routing logic (booking intent detection)
- ✅ Booking API client (bookingApi.ts)
- ✅ Smart airport code mapping (Peru → LIM, etc.)
- ✅ Itinerary-based origin extraction

---

## 🚧 Phase 7.1.1: Agent Routing & Booking Chat UI

**Status**: 70% complete

### Remaining Tasks
- [ ] Create `BookingModeIndicator` component (sticky header showing booking mode)
- [ ] Implement full booking chat flow with conversational responses
- [ ] Add context preservation when switching between planning and booking modes
- [ ] Create booking agent system prompt (see FLIGHT_BOOKING_PLAN.md line 382-456)
- [ ] Implement `/api/booking/chat` endpoint with GPT-4o
- [ ] Add "Exit Booking Mode" functionality
- [ ] Test mode switching edge cases

**Estimated Effort**: 1-2 days

---

## 🚧 Phase 7.1.2: Duffel Integration & Flight Search

**Status**: 90% complete (backend done, frontend done, needs polish)

### Remaining Tasks
- [ ] ~~Set up Duffel API account~~ (Already configured with mock data)
- [ ] Switch from mock data to real Duffel API calls (requires API key)
- [ ] Add Kiwi.com as backup provider
- [ ] Implement provider failover logic in FlightAggregator
- [ ] Add search result caching optimization (15min TTL)
- [ ] Create cache invalidation strategy
- [ ] Add loading states and skeleton screens for search results
- [ ] Implement error handling for failed searches
- [ ] Add "No flights found" empty state with suggestions

**Estimated Effort**: 2-3 days

---

## 🔴 Phase 7.1.3: Booking Flow & Passenger Forms

**Status**: 40% complete (forms exist, flow incomplete)

### Remaining Tasks
- [ ] Design conversational passenger info flow
- [ ] Implement multi-passenger support (currently single passenger)
- [ ] Add passenger profile saving/loading from database
- [ ] Create `PassengerProfile` CRUD endpoints
- [ ] Implement form validation:
  - [ ] Passport number format validation
  - [ ] Date of birth validation (age restrictions)
  - [ ] Name matching (first/last name)
  - [ ] Expiry date validation (passport not expired)
- [ ] Add seat selection feature (if Duffel supports)
- [ ] Build meal preference selection
- [ ] Create booking preview screen before payment
- [ ] Add "Edit" functionality to go back and modify selections
- [ ] Implement booking draft saving (resume later)

**Estimated Effort**: 1 week

---

## 🔴 Phase 7.1.4: Payment Integration

**Status**: 0% complete

### Remaining Tasks
- [ ] Extend Stripe service for flight bookings
- [ ] Create payment intent endpoint (`POST /api/booking/payment/intent`)
- [ ] Implement `BookingSummary` component with price breakdown
- [ ] Add Stripe checkout integration
  - [ ] Create Stripe Elements for card input
  - [ ] Handle 3D Secure authentication
  - [ ] Implement Apple Pay / Google Pay support
- [ ] Create Stripe webhook handler for payment confirmation
- [ ] Update booking status in database after payment
- [ ] Handle payment failures gracefully
  - [ ] Show user-friendly error messages
  - [ ] Implement retry logic
  - [ ] Save failed payment attempts for debugging
- [ ] Add payment confirmation email
- [ ] Implement refund logic for cancellations
- [ ] Add commission calculation and tracking
- [ ] Test with Stripe test cards

**Estimated Effort**: 1-2 weeks

---

## 🔴 Phase 7.1.5: Confirmation & Itinerary Sync

**Status**: 30% complete (BookingConfirmation component exists)

### Remaining Tasks
- [ ] Implement auto-add to itinerary logic
  - [ ] Create new "transport" item in trip days
  - [ ] Calculate correct day based on departure date
  - [ ] Add flight details to item (airline, flight number, times)
- [ ] Create booking confirmation email template
  - [ ] Include PNR, flight details, passenger info
  - [ ] Add calendar attachment (.ics file)
  - [ ] Include check-in link
- [ ] Implement e-ticket download
  - [ ] Generate PDF from booking data
  - [ ] Store ticket URLs in database
  - [ ] Add download button to confirmation
- [ ] Add calendar export (.ics file generation)
- [ ] Create check-in reminder system
  - [ ] Send email 24 hours before departure
  - [ ] Include check-in link and gate info
- [ ] Build booking history view
  - [ ] List all user bookings
  - [ ] Filter by status (upcoming, completed, cancelled)
  - [ ] Show booking details on click
- [ ] Add "View in Itinerary" button that navigates to trip
- [ ] Implement booking modification flow (if Duffel supports)

**Estimated Effort**: 1 week

---

## 🔴 Phase 7.1.6: Price Alerts & Advanced Features

**Status**: 0% complete

### Remaining Tasks

### Price Alerts
- [ ] Implement price alert creation UI
  - [ ] Create `PriceAlertCard` component
  - [ ] Add "Track this price" button to search results
  - [ ] Allow flexible date ranges
- [ ] Create price alert endpoints
  - [ ] `POST /api/booking/alerts` - Create alert
  - [ ] `GET /api/booking/alerts` - List user alerts
  - [ ] `DELETE /api/booking/alerts/:id` - Delete alert
- [ ] Implement background job for price checking (node-cron)
  - [ ] Check alerts every 6 hours
  - [ ] Compare current price to target
  - [ ] Trigger email if price drops
- [ ] Send price drop emails
  - [ ] Create email template
  - [ ] Include "Book Now" CTA
  - [ ] Show price comparison

### Advanced Features
- [ ] Add flexible date calendar view
  - [ ] Show price by date in grid format
  - [ ] Highlight cheapest days
  - [ ] Allow quick date selection
- [ ] Implement "Smart Bundling" suggestions
  - [ ] "Save $X by flying Tuesday instead"
  - [ ] "Add hotel for only $Y more"
- [ ] Create price history charts
  - [ ] Track historical prices for routes
  - [ ] Show price trends (going up/down)
  - [ ] Predict best time to book
- [ ] Add carbon footprint display
  - [ ] Calculate CO2 emissions per flight
  - [ ] Show comparison to alternatives
  - [ ] Offer carbon offset option

**Estimated Effort**: 2 weeks

---

## 🔴 Phase 7.1.7: Testing & Polish

**Status**: 0% complete

### Remaining Tasks

### Testing
- [ ] End-to-end testing with Playwright
  - [ ] Test full booking flow (search → payment → confirmation)
  - [ ] Test mode switching (planning ↔ booking)
  - [ ] Test form validation
  - [ ] Test payment errors
- [ ] Unit tests for booking services
  - [ ] FlightAggregator caching logic
  - [ ] Provider failover
  - [ ] Commission calculation
  - [ ] Passenger validation
- [ ] Integration tests for booking API
  - [ ] Search endpoint
  - [ ] Create booking endpoint
  - [ ] Payment flow
  - [ ] Itinerary sync
- [ ] Load testing
  - [ ] 100 concurrent searches
  - [ ] 50 concurrent bookings
  - [ ] Cache performance under load

### Error Handling
- [ ] Add comprehensive error messages for all edge cases
  - [ ] Invalid airport codes
  - [ ] No flights found
  - [ ] Payment declined
  - [ ] Booking unavailable
  - [ ] API provider errors
- [ ] Implement retry logic for transient failures
- [ ] Add fallback UI for critical errors
- [ ] Log all errors to monitoring service

### Performance Optimization
- [ ] Implement aggressive caching strategy
  - [ ] Cache flight searches (15min TTL)
  - [ ] Cache airport code lookups
  - [ ] Cache passenger profiles
- [ ] Add lazy loading for booking components
- [ ] Optimize bundle size (code splitting)
- [ ] Add image optimization for airline logos
- [ ] Implement service worker for offline support

### Mobile Responsiveness
- [ ] Test on iPhone (Safari)
- [ ] Test on Android (Chrome)
- [ ] Test on iPad (tablet view)
- [ ] Optimize for small screens (<375px)
- [ ] Add touch-friendly UI elements
- [ ] Test in landscape orientation

### Accessibility
- [ ] WCAG AA compliance audit
- [ ] Keyboard navigation support
- [ ] Screen reader testing
- [ ] Color contrast validation
- [ ] Focus management
- [ ] ARIA labels for all interactive elements

### Security
- [ ] Security audit of payment flow
  - [ ] Validate amounts server-side
  - [ ] Prevent CSRF attacks
  - [ ] Sanitize all inputs
- [ ] Encrypt sensitive data at rest
  - [ ] Passport numbers
  - [ ] Payment information
- [ ] Implement rate limiting
  - [ ] Max 5 bookings per hour per user
  - [ ] Max 20 searches per minute
- [ ] Add webhook signature validation
- [ ] Test for SQL injection vulnerabilities
- [ ] Test for XSS vulnerabilities

### Documentation
- [ ] Update CLAUDE.md with booking instructions
- [ ] Create user guide for flight booking
- [ ] Document API endpoints
- [ ] Add inline code documentation
- [ ] Create troubleshooting guide
- [ ] Document environment variables
- [ ] Update README with booking features

**Estimated Effort**: 2 weeks

---

## 🔮 Future Enhancements (Post-MVP)

### Phase 7.2: Multi-Provider Support
- [ ] Add Kiwi.com provider
- [ ] Add Amadeus provider (if budget allows)
- [ ] Implement intelligent provider selection
- [ ] Add meta-search across all providers
- [ ] Show provider badges on results

### Phase 7.3: Hotel Bundling
- [ ] Integrate hotel booking API
- [ ] Create hotel search components
- [ ] Implement flight + hotel packages
- [ ] Add bundle discount logic

### Phase 7.4: Additional Services
- [ ] Car rental integration
- [ ] Travel insurance upsell
- [ ] Airport transfer booking
- [ ] Visa assistance

### Phase 7.5: Loyalty Programs
- [ ] Frequent flyer number input
- [ ] Miles calculation
- [ ] Airline status matching
- [ ] Loyalty program signup

### Phase 7.6: AI Innovations
- [ ] Predictive pricing ML model
- [ ] Natural language seat selection
- [ ] Smart rebooking on price drops
- [ ] Voice booking via assistant
- [ ] Personalized recommendations based on history

### Phase 7.7: Group Bookings
- [ ] Support for 10+ passengers
- [ ] Group pricing discounts
- [ ] Multi-room hotel booking
- [ ] Group itinerary management

---

## 📊 Progress Summary

| Phase | Status | Completion | Estimated Time Remaining |
|-------|--------|------------|--------------------------|
| 7.1.1 - Agent Routing | 🚧 In Progress | 70% | 1-2 days |
| 7.1.2 - Flight Search | 🚧 In Progress | 90% | 2-3 days |
| 7.1.3 - Booking Flow | 🔴 Blocked | 40% | 1 week |
| 7.1.4 - Payment | 🔴 Not Started | 0% | 1-2 weeks |
| 7.1.5 - Confirmation | 🔴 Blocked | 30% | 1 week |
| 7.1.6 - Price Alerts | 🔴 Not Started | 0% | 2 weeks |
| 7.1.7 - Testing | 🔴 Not Started | 0% | 2 weeks |
| **TOTAL** | | **~33%** | **6-8 weeks** |

---

## 🎯 Next Immediate Steps (Priority Order)

1. **Create BookingModeIndicator component** (1 day)
   - Visual indicator when in booking mode
   - Exit booking mode button
   - Improves UX clarity

2. **Implement passenger form validation** (2 days)
   - Critical for preventing booking errors
   - Passport format, date validation, etc.

3. **Add Stripe payment integration** (1 week)
   - Core feature blocking Phase 7.1.4
   - Required for end-to-end booking

4. **Implement itinerary sync** (3 days)
   - Auto-add booked flights to trip
   - Core value proposition

5. **Add booking confirmation emails** (2 days)
   - Expected user experience
   - Builds trust

6. **Create price alert system** (1 week)
   - Differentiating feature
   - Drives re-engagement

7. **Testing & polish** (2 weeks)
   - Ensure production quality
   - Security and performance

---

## 🚀 Deployment Checklist (Before Production)

- [ ] All Phase 7.1.1-7.1.5 tasks completed
- [ ] Security audit passed
- [ ] Load testing completed (100+ concurrent users)
- [ ] Mobile responsiveness verified
- [ ] Accessibility audit passed (WCAG AA)
- [ ] Stripe live mode enabled and tested
- [ ] Duffel production API key configured
- [ ] Monitoring and alerting set up
- [ ] Error tracking configured (Sentry)
- [ ] Legal review of booking terms completed
- [ ] Customer support documentation ready
- [ ] Backup provider (Kiwi.com) tested and ready
- [ ] Rate limiting configured
- [ ] Database indexes optimized
- [ ] CDN caching configured
- [ ] Rollback plan documented

---

## 📝 Notes

- Backend infrastructure (PR #43) is complete and production-ready
- Frontend UI components (PR #44) are complete but need integration work
- Payment integration is the critical blocking path for MVP
- Consider phased rollout (beta users first)
- Monitor booking completion rate closely in first month

**Last Updated**: January 2025
**Document Owner**: Engineering Team
**Related**: [FLIGHT_BOOKING_PLAN.md](./FLIGHT_BOOKING_PLAN.md), [PR #43](https://github.com/kaikezhang/otterly-go/pull/43), [PR #44](https://github.com/kaikezhang/otterly-go/pull/44)
