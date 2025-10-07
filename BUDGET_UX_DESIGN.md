# Budget Planning - UX/UI Design

## Overview
Enable users to set and track budgets during trip planning, with real-time cost tracking, multi-currency support, and intelligent budget optimization suggestions.

---

## 1. User Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ INITIAL TRIP GENERATION                                         │
│                                                                 │
│ User: "Plan a 5-day trip to Tokyo"                            │
│ AI: Generates itinerary                                        │
│                                                                 │
│ ┌───────────────────────────────────────┐                     │
│ │ 💰 Set a budget for this trip?        │                     │
│ │ ┌─────────┐  ┌──────────────────────┐ │                     │
│ │ │ Skip    │  │ Set Budget (Primary) │ │                     │
│ │ └─────────┘  └──────────────────────┘ │                     │
│ └───────────────────────────────────────┘                     │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ BUDGET SETUP MODAL                                              │
│                                                                 │
│  Set Your Budget                                          [X]   │
│  ──────────────────────────────────────────────────────────    │
│                                                                 │
│  Total Budget                                                   │
│  ┌────────┐ ┌──────────────────────────────────┐              │
│  │  USD ▾ │ │            5000                   │              │
│  └────────┘ └──────────────────────────────────┘              │
│                                                                 │
│  💡 Based on your itinerary, typical costs:                    │
│     Flights: ~$800 | Hotels: ~$600 | Food: ~$400               │
│                                                                 │
│  ☐ Set budget by category (optional)                           │
│                                                                 │
│  ┌──────────────────┐  ┌─────────────────────┐               │
│  │ Skip for now     │  │ Save Budget         │               │
│  └──────────────────┘  └─────────────────────┘               │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ BUDGET BY CATEGORY (EXPANDED)                                   │
│                                                                 │
│  Allocate by Category                                           │
│  ────────────────────────────────────────────────────           │
│                                                                 │
│  🛫 Flights         $800   ████████░░  40%                     │
│  🏨 Hotels          $600   ██████░░░░  30%                     │
│  🍽️  Food           $400   ████░░░░░░  20%                     │
│  🎭 Activities      $150   █░░░░░░░░░   8%                     │
│  🚗 Transport       $50    ░░░░░░░░░░   2%                     │
│                                                                 │
│  Total: $2,000 / $5,000 allocated                              │
│                                                                 │
│  💡 AI can auto-allocate based on your itinerary               │
│  ┌──────────────────────────────────────┐                     │
│  │ Auto-allocate with AI                │                     │
│  └──────────────────────────────────────┘                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Budget Tracking Panel (Persistent UI)

### Location
**Right sidebar** (above or integrated with MapView) - always visible during planning

### Design

```
┌─────────────────────────────────────────┐
│ 💰 Budget Tracker            [Settings] │
├─────────────────────────────────────────┤
│                                         │
│  $2,450 / $5,000 USD                   │
│  ████████████░░░░░░░░░░░░░  49%        │
│                                         │
│  🟢 $2,550 remaining                    │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │ 🛫 Flights    $800 / $800  100%  │  │
│  │ 🏨 Hotels     $950 / $600  158%  │  │ ⚠️ Over
│  │ 🍽️  Food       $400 / $400  100%  │  │
│  │ 🎭 Activities $250 / $150  167%  │  │ ⚠️ Over
│  │ 🚗 Transport  $50  / $50   100%  │  │
│  └──────────────────────────────────┘  │
│                                         │
│  💡 2 optimization suggestions          │
│  ┌──────────────────────────────────┐  │
│  │ View Suggestions →               │  │
│  └──────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### States

**🟢 Green (< 80% spent):**
- Green progress bar
- "You're within budget!"

**🟡 Yellow (80-100% spent):**
- Yellow/orange progress bar
- "⚠️ Approaching budget limit"

**🔴 Red (> 100% spent):**
- Red progress bar
- "⚠️ $450 over budget"
- Show optimization suggestions

---

## 3. Itinerary Item Cost Display

### Individual Item Card

```
┌─────────────────────────────────────────────────────┐
│ Day 1 - Morning                          💰 $1,200  │ ← Daily total
├─────────────────────────────────────────────────────┤
│                                                     │
│ 🛫 Flight to Tokyo (SFO → NRT)                     │
│    7:00 AM - 2:30 PM (+1 day)                      │
│    💰 $800 (Flight)                     [Remove]   │ ← Item cost + category
│                                                     │
│ 🏨 Park Hyatt Tokyo                                │
│    Check-in: 3:00 PM                               │
│    💰 $400/night × 3 nights = $1,200 (Hotel)       │
│    ⚠️ Budget alternative available (-$300)         │ ← Optimization hint
│                                                     │
│ 🍜 Dinner at Ichiran Ramen                         │
│    6:00 PM                                         │
│    💰 Not set · Add cost                           │ ← Prompt for missing cost
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Cost Input Interaction

```
User clicks "Add cost" or "💰 $800"
↓
┌─────────────────────────────────────────┐
│ Activity Cost                           │
│                                         │
│ Flight to Tokyo (SFO → NRT)            │
│                                         │
│ Cost                                    │
│ ┌────────┐ ┌───────────────────────┐  │
│ │ USD ▾  │ │      800              │  │
│ └────────┘ └───────────────────────┘  │
│                                         │
│ Category                                │
│ ┌─────────────────────────────────────┐│
│ │ 🛫 Flights                      ▾   ││
│ └─────────────────────────────────────┘│
│                                         │
│ ☐ Estimated cost (not confirmed)       │
│                                         │
│ ┌─────────┐  ┌────────────────────┐   │
│ │ Cancel  │  │ Save               │   │
│ └─────────┘  └────────────────────┘   │
└─────────────────────────────────────────┘
```

---

## 4. Budget Optimization Suggestions

### Trigger Conditions
- Budget exceeds 90% of total
- Any category exceeds 120% of allocated amount
- User adds expensive item
- User asks "How can I save money?"

### Suggestion Card (in Chat)

```
┌─────────────────────────────────────────────────────────┐
│ 💡 Budget Optimization Suggestions                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ You're $450 over budget. Here are ways to save:        │
│                                                         │
│ 1️⃣ Switch Hotels                              Save $300 │
│    Current: Park Hyatt Tokyo ($400/night)              │
│    Alternative: Hotel Gracery Shinjuku ($300/night)    │
│    Similar ratings, same area                          │
│    ┌──────────────────┐  ┌───────────────────────┐    │
│    │ View Details     │  │ Apply Change          │    │
│    └──────────────────┘  └───────────────────────┘    │
│                                                         │
│ 2️⃣ Remove Activities                          Save $150 │
│    "Tokyo Skytree Visit" is optional                   │
│    ┌──────────────────┐  ┌───────────────────────┐    │
│    │ Keep Activity    │  │ Remove Activity       │    │
│    └──────────────────┘  └───────────────────────┘    │
│                                                         │
│ 3️⃣ Adjust Food Budget                         Save $200 │
│    Switch 2 fine dining meals to casual spots          │
│    ┌──────────────────────────────────────────────┐   │
│    │ Show Alternatives                            │   │
│    └──────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 5. Multi-Currency Support

### Currency Conversion UI

```
┌─────────────────────────────────────────┐
│ Budget Settings                    [X]  │
├─────────────────────────────────────────┤
│                                         │
│ Primary Currency                        │
│ ┌─────────────────────────────────────┐│
│ │ 🇺🇸 USD - US Dollar             ▾   ││
│ └─────────────────────────────────────┘│
│                                         │
│ Destination Currency                    │
│ ┌─────────────────────────────────────┐│
│ │ 🇯🇵 JPY - Japanese Yen          ▾   ││
│ └─────────────────────────────────────┘│
│                                         │
│ Exchange Rate (Live)                    │
│ 1 USD = 149.23 JPY                     │
│ Updated: 2 minutes ago 🔄              │
│                                         │
│ ☑️ Show costs in both currencies        │
│                                         │
└─────────────────────────────────────────┘
```

### Dual Currency Display

```
💰 $800 (¥119,384)
   ─────  ────────
   Primary Destination
```

---

## 6. Budget Warnings & Alerts

### In-Chat Warnings

```
User: "Add a kaiseki dinner at Kikunoi"
↓
Assistant Message:
┌─────────────────────────────────────────┐
│ ⚠️ Budget Warning                       │
├─────────────────────────────────────────┤
│ This activity costs ~$250                │
│ Adding it will put you $200 over budget │
│                                         │
│ Would you like to:                      │
│ • Add it anyway                         │
│ • Find a cheaper alternative            │
│ • Remove something else first           │
└─────────────────────────────────────────┘
```

### Quick Reply Options

```
┌────────────────┐ ┌────────────────┐ ┌─────────────────┐
│ Add anyway     │ │ Find cheaper   │ │ Remove other    │
└────────────────┘ └────────────────┘ └─────────────────┘
```

---

## 7. AI Integration for Budget Planning

### Enhanced Prompts

**Initial Planning:**
> "Plan a 5-day trip to Tokyo with a budget of $3,000"

AI Response:
- Generates itinerary with estimated costs
- Auto-categorizes items
- Warns if destination is typically expensive
- Suggests budget allocation

**During Planning:**
> "What can I do in Tokyo for under $50?"

AI Response:
- Filters suggestions by price
- Shows free/cheap alternatives
- Explains cost breakdowns

**Optimization:**
> "I'm over budget, help me save money"

AI Response:
- Analyzes current spending
- Identifies expensive items
- Suggests specific swaps with cost savings
- Preserves trip quality/highlights

---

## 8. Mobile Considerations

### Collapsed Budget Panel (Mobile)

```
┌─────────────────────────────────┐
│ 💰 $2,450 / $5,000  (49%) ▾    │ ← Tappable to expand
└─────────────────────────────────┘
```

### Expanded (Full Screen Modal)

```
┌─────────────────────────────────┐
│ Budget Tracker            [X]   │
├─────────────────────────────────┤
│                                 │
│  $2,450 / $5,000 USD           │
│  ████████████░░░░  49%         │
│                                 │
│  🟢 $2,550 remaining            │
│                                 │
│  By Category:                   │
│  🛫 Flights    $800 / $800     │
│  🏨 Hotels     $950 / $600 ⚠️  │
│  🍽️  Food       $400 / $400     │
│                                 │
│  [View Suggestions]             │
│                                 │
└─────────────────────────────────┘
```

---

## 9. Database Schema Requirements

```typescript
// Add to Trip model
interface Trip {
  // ... existing fields
  budget?: {
    total: number;
    currency: string; // ISO code (USD, JPY, EUR)
    categories?: {
      flights?: number;
      hotels?: number;
      food?: number;
      activities?: number;
      transport?: number;
      misc?: number;
    };
  };
}

// Add to ItineraryItem model
interface ItineraryItem {
  // ... existing fields
  cost?: {
    amount: number;
    currency: string;
    category: 'flights' | 'hotels' | 'food' | 'activities' | 'transport' | 'misc';
    isEstimated: boolean; // true if not confirmed
  };
}

// New: Budget Optimization Suggestions
interface BudgetSuggestion {
  type: 'swap' | 'remove' | 'downgrade';
  itemId: string; // itinerary item to change
  savings: number;
  alternative?: ItineraryItem; // for swap/downgrade
  reasoning: string;
}
```

---

## 10. Implementation Phases

### Phase 1: Basic Budget Setting (MVP)
- ✅ Set total budget
- ✅ Budget tracker panel (total only)
- ✅ Manual cost input for items
- ✅ Simple over/under budget indicator

### Phase 2: Category Allocation
- ✅ Budget by category
- ✅ Auto-categorize items
- ✅ Category-level warnings
- ✅ Category breakdown in panel

### Phase 3: Multi-Currency
- ✅ Currency selection
- ✅ Live exchange rate API integration
- ✅ Dual currency display
- ✅ Auto-convert item costs

### Phase 4: AI Optimization
- ✅ Budget optimization suggestions
- ✅ AI-powered alternative finder
- ✅ Contextual budget warnings in chat
- ✅ Auto-allocation based on itinerary

---

## 11. Key UX Principles

1. **Non-Intrusive:** Budget is optional, can be skipped
2. **Progressive Disclosure:** Basic → Category → Optimization
3. **Real-Time Feedback:** Instant updates as items change
4. **Actionable Suggestions:** One-click to apply changes
5. **Transparent:** Always show how budget is calculated
6. **Forgiving:** Easy to adjust budget mid-planning
7. **Contextual:** Warnings appear when relevant, not constantly

---

## 12. Success Metrics

- % of users who set a budget during planning
- % of trips that stay within budget
- # of optimization suggestions accepted
- Time spent on budget allocation
- User satisfaction with budget feature (survey)

---

## Next Steps

1. **Review & Iterate:** Get feedback on this design
2. **Build Phase 1 MVP:** Basic budget setting + tracking
3. **Test with Users:** Real-world validation
4. **Expand:** Add categories, currency, AI optimization
