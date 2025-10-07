# Budget Features Testing Guide

## Prerequisites
1. Dev server running: `npm run dev`
2. Open browser to `http://localhost:5173`
3. Log in with your Google account

---

## Phase 1: Basic Budget Setting & Tracking

### Test 1: Set a Trip Budget

**Steps:**
1. Create a new trip or open an existing trip
2. Look for the **Budget Tracker** panel in the right sidebar (below the map)
3. Click the **"Set Budget"** button
4. In the modal:
   - Select a currency (e.g., USD)
   - Enter a budget amount (e.g., 5000)
   - Click **"Save Budget"**

**Expected Results:**
- ✅ Modal closes
- ✅ Budget Tracker shows: `$0 / $5,000 USD`
- ✅ Progress bar is at 0%
- ✅ Status shows green "🟢 $5,000 remaining"

---

### Test 2: Add Costs to Activities

**Steps:**
1. Enable **Edit Mode** (toggle in top-right)
2. Find an itinerary item (any activity)
3. In the item card, look for the cost input field (💰 icon)
4. Enter a cost amount (e.g., 200)
5. Repeat for 2-3 more activities with different amounts

**Expected Results:**
- ✅ Cost appears in the activity card when not in edit mode
- ✅ Budget Tracker updates in real-time
- ✅ Total spent increases
- ✅ Progress bar fills proportionally
- ✅ Remaining budget decreases

---

### Test 3: Budget Warnings

**Test 3a: Approaching Budget (80%)**

**Steps:**
1. Add costs until total spent reaches 80-99% of budget
   - Example: If budget is $5,000, add costs totaling $4,000-$4,900

**Expected Results:**
- ✅ Progress bar turns yellow
- ✅ Status icon changes to 🟡
- ✅ Yellow warning box appears: "⚠️ You're approaching your budget limit"

**Test 3b: Exceeding Budget (100%+)**

**Steps:**
1. Add more costs until total exceeds budget
   - Example: If budget is $5,000, add costs totaling $5,100

**Expected Results:**
- ✅ Progress bar turns red
- ✅ Status icon changes to 🔴
- ✅ Status shows: "$100 over budget"
- ✅ Red warning box appears: "⚠️ You've exceeded your budget"

---

### Test 4: Edit Budget

**Steps:**
1. Click the ⚙️ **Settings icon** in Budget Tracker header
2. Change the budget amount or currency
3. Click **"Save Budget"**

**Expected Results:**
- ✅ Budget Tracker updates with new values
- ✅ Percentages recalculate
- ✅ Warning colors update if thresholds change

---

## Phase 2: Budget Category Allocation

### Test 5: Set Budget with Categories

**Steps:**
1. Open Budget Setup Modal (Settings icon)
2. Enter total budget (e.g., 5000)
3. Click **"Set budget by category (optional)"** to expand
4. Allocate budget across categories:
   - ✈️ Flights: 1500
   - 🏨 Hotels: 1200
   - 🍽️ Food: 800
   - 🎟️ Activities: 1000
   - 🚗 Transport: 300
   - 💼 Misc: 200
5. Watch the allocation summary update

**Expected Results:**
- ✅ "Allocated" shows $5,000
- ✅ "Remaining" shows $0
- ✅ Progress bar is 100% (green if exactly matching total)
- ✅ No over-allocation warning

---

### Test 6: Over-Allocation Warning

**Steps:**
1. In category allocation, enter amounts totaling MORE than budget
   - Example: Budget $5,000, but allocate $5,500 total

**Expected Results:**
- ✅ Progress bar turns red
- ✅ "Remaining" shows negative amount (-$500)
- ✅ Red warning: "⚠️ Total allocation exceeds budget by $500"

---

### Test 7: Auto-Categorization

**Steps:**
1. Enable Edit Mode
2. Find activities of different types:
   - **Transport** item (e.g., "Taxi to airport")
   - **Food** item (e.g., "Lunch at restaurant")
   - **Sight/Museum** item (e.g., "Visit Machu Picchu")
3. Add a cost to each (e.g., 50, 30, 100)

**Expected Results:**
- ✅ Transport item → Auto-categorized as "🚗 Transport"
- ✅ Food item → Auto-categorized as "🍽️ Food"
- ✅ Sight/Museum item → Auto-categorized as "🎟️ Activities"
- ✅ Category selector dropdown appears with correct selection

---

### Test 8: Manual Category Override

**Steps:**
1. Find an activity with a cost and auto-category
2. In Edit Mode, click the **category dropdown**
3. Select a different category (e.g., change Food to Misc)

**Expected Results:**
- ✅ Dropdown updates to new selection
- ✅ Budget Tracker category breakdown updates
- ✅ Spending moves from old category to new category

---

### Test 9: Category Breakdown Display

**Steps:**
1. Set budget with categories (Test 5)
2. Add costs to various activities with different categories
3. Scroll down in Budget Tracker to **"Budget by Category"** section

**Expected Results:**
- ✅ Each category shows: Icon, Name, Spent/Allocated
- ✅ Mini progress bars for each category
- ✅ Color coding:
  - Green: < 80% spent
  - Yellow: 80-99% spent
  - Red: 100%+ spent
- ✅ Real-time updates as you add/change costs

---

### Test 10: Category Budget Warnings

**Steps:**
1. Set category budgets (e.g., Food: $800)
2. Add food items totaling $650+ (80%+)

**Expected Results:**
- ✅ Food category progress bar turns yellow
- ✅ Spending shows in yellow/red text

**Steps (continued):**
3. Add more food costs to exceed $800

**Expected Results:**
- ✅ Food category progress bar turns red
- ✅ Shows amount over category budget

---

### Test 11: Category Display in Activity Cards

**Steps:**
1. Exit Edit Mode
2. View activity cards with costs

**Expected Results:**
- ✅ Cost shows: "💰 200 USD (🎟️ Activities)"
- ✅ Category icon and name appear after cost
- ✅ Format is clean and readable

---

### Test 12: Persistence Test

**Steps:**
1. Set budget with categories
2. Add costs with categories to multiple activities
3. Refresh the page (F5)

**Expected Results:**
- ✅ Budget settings persist
- ✅ All category allocations remain
- ✅ All activity costs and categories remain
- ✅ Budget Tracker shows correct totals

---

## Edge Cases to Test

### Test 13: Budget Without Categories (Phase 1 Mode)

**Steps:**
1. Set budget WITHOUT expanding category section
2. Add costs to activities

**Expected Results:**
- ✅ Budget tracking works normally
- ✅ No category breakdown shown
- ✅ Category selector still appears for activities (optional)

---

### Test 14: Removing Costs

**Steps:**
1. In Edit Mode, clear a cost field (delete the number)
2. Save changes

**Expected Results:**
- ✅ Cost disappears from activity card
- ✅ Budget Tracker decreases total spent
- ✅ Category breakdown updates (if categorized)

---

### Test 15: Multiple Currencies

**Steps:**
1. Set budget in EUR
2. Add costs to activities
3. Change budget to USD

**Expected Results:**
- ✅ All displays update to show $ instead of €
- ✅ Numbers remain the same (no conversion)
- ✅ Category tracking continues working

---

### Test 16: Zero Budget

**Steps:**
1. Try to set budget to 0 or negative number

**Expected Results:**
- ✅ "Save Budget" button is disabled
- ✅ Cannot save invalid budget

---

### Test 17: Large Numbers

**Steps:**
1. Set budget to 1,000,000
2. Add costs with large amounts (50,000+)

**Expected Results:**
- ✅ Numbers display with comma separators
- ✅ Percentages calculate correctly
- ✅ No layout breaking

---

## Visual Regression Checklist

### Budget Tracker Panel
- [ ] Fits in right sidebar without overflow
- [ ] Text is readable (not truncated)
- [ ] Progress bars are smooth
- [ ] Colors are correct (green/yellow/red)
- [ ] Icons render properly

### Budget Setup Modal
- [ ] Modal is centered
- [ ] Category section expands/collapses smoothly
- [ ] Input fields are aligned
- [ ] Progress bar updates in real-time
- [ ] Warning messages are visible

### Activity Cards
- [ ] Cost input doesn't break layout
- [ ] Category selector fits inline
- [ ] Display mode shows cost cleanly
- [ ] Icons render properly

---

## Performance Checklist

- [ ] Budget Tracker updates instantly when costs change
- [ ] No lag when typing in cost fields
- [ ] Category dropdown opens quickly
- [ ] Modal opens/closes smoothly
- [ ] Page refresh loads budget data quickly

---

## Browser Compatibility

Test in:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

---

## Mobile Testing

- [ ] Budget Tracker is accessible on mobile
- [ ] Modal fits on mobile screen
- [ ] Category inputs are tappable
- [ ] Progress bars render correctly
- [ ] Text is readable at mobile sizes

---

## Summary of Key Features to Verify

### Phase 1 ✅
- [x] Set total budget with currency selection
- [x] Add costs to individual activities
- [x] Real-time budget tracking
- [x] Color-coded warnings (green/yellow/red)
- [x] Progress bar visualization
- [x] Edit/update budget

### Phase 2 ✅
- [x] Allocate budget by category
- [x] Over-allocation warnings
- [x] Auto-categorization based on activity type
- [x] Manual category selection
- [x] Per-category budget tracking
- [x] Per-category progress bars
- [x] Category display in activity cards
- [x] Category breakdown in Budget Tracker

---

## Troubleshooting

**Issue:** Budget Tracker doesn't appear
- **Fix:** Make sure you have a trip loaded (not on dashboard)

**Issue:** Cost input doesn't show
- **Fix:** Enable Edit Mode first

**Issue:** Category selector doesn't appear
- **Fix:** Enter a cost first, then selector appears

**Issue:** Changes don't persist
- **Fix:** Check browser localStorage or database connection

**Issue:** Colors don't change
- **Fix:** Make sure total spent crosses 80% and 100% thresholds

---

## Quick Test Script (5 minutes)

```
1. Create new trip → Set budget $5000 USD
2. Add cost $200 to 3 activities → Check tracker updates
3. Open budget settings → Allocate categories
4. Add costs to see auto-categorization
5. Exceed a category budget → Check red warning
6. Exceed total budget → Check red warning
7. Refresh page → Verify persistence
```

**Expected Total Time:** 15-20 minutes for full testing
**Quick Test Time:** 5 minutes for basic verification
