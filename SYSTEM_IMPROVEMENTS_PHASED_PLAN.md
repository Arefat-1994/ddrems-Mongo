# System Improvements - Phased Implementation Plan

## Overview
This document outlines the phased approach to implement 8 major improvements to the messaging and property viewing system.

---

## PHASE 1: Message Reply System
**Goal**: Add reply functionality to messages with compose fields

### Tasks:
1. Create `MessageReply.js` component
2. Add reply button to message view
3. Create reply compose modal/form
4. Add backend endpoint for replies
5. Update messages table to track reply chains
6. Display reply threads in message view

**Estimated Time**: 2-3 hours
**Priority**: HIGH

---

## PHASE 2: Sidebar Navigation Consolidation
**Goal**: Remove duplicate messages button and consolidate to sidebar

### Tasks:
1. Remove messages button from below profile line
2. Ensure sidebar messages link works for all dashboards
3. Update all dashboard components (User, Owner, PropertyAdmin, SystemAdmin, Broker, Customer)
4. Add notification badge to sidebar messages
5. Test navigation on all dashboard types

**Estimated Time**: 1-2 hours
**Priority**: HIGH

---

## PHASE 3: AI Price Advice in Property View
**Goal**: Display AI predicted prices when viewing properties

### Tasks:
1. Create `PropertyPriceAdvice.js` component
2. Integrate AI model from `/AI` folder
3. Load CSV data for price predictions
4. Display actual vs predicted price in property view modal
5. Add to all dashboards (PropertyAdmin, SystemAdmin, Owner, Broker, Customer)
6. Format display similar to PropertyAdmin document verification

**Estimated Time**: 3-4 hours
**Priority**: HIGH

---

## PHASE 4: User Dashboard Message Buttons
**Goal**: Fix non-functional message buttons in user dashboard

### Tasks:
1. Identify the two message buttons in user dashboard
2. Button 1: Display incoming message notifications
3. Button 2: Navigate to messages page
4. Connect to current messaging system
5. Add unread count badges
6. Test functionality

**Estimated Time**: 1-2 hours
**Priority**: HIGH

---

## PHASE 5: Customer Dashboard AI Price Integration
**Goal**: Add AI price advice to customer property viewing

### Tasks:
1. Integrate AI price advice in customer dashboard property view
2. Add guide button for property recommendations
3. Create recommendation engine based on customer preferences
4. Display price recommendations
5. Show both actual and AI predicted prices
6. Add property type guidance

**Estimated Time**: 3-4 hours
**Priority**: MEDIUM

---

## PHASE 6: Request Key & Agreement Buttons in View
**Goal**: Add request key and agreement request buttons in property view modal

### Tasks:
1. Add "Request Key" button in property view modal
2. Add "Agreement Request" button in property view modal
3. Create modals for each request type
4. Connect to existing key-request and agreement-request endpoints
5. Display buttons after property details
6. Test on all dashboard types

**Estimated Time**: 2-3 hours
**Priority**: MEDIUM

---

## PHASE 7: Owner Dashboard Agreements
**Goal**: Add functionality to agreements button in owner dashboard

### Tasks:
1. Create agreements management component
2. Display owner's agreements
3. Add agreement status tracking
4. Add agreement actions (view, approve, reject)
5. Connect to agreement endpoints
6. Add notifications for agreement updates

**Estimated Time**: 2-3 hours
**Priority**: MEDIUM

---

## PHASE 8: Owner Dashboard AI Price Advice
**Goal**: Add AI price prediction when adding new property

### Tasks:
1. Create AI price prediction form component
2. Add selection options for:
   - Near school (Yes/No)
   - Near hospital (Yes/No)
   - Near road (Yes/No)
   - Near industry (Yes/No)
3. Display predicted price based on selections
4. Show both predicted and manual price
5. Allow owner to choose which price to use
6. Implement for all user roles (Owner, PropertyAdmin, Broker)

**Estimated Time**: 3-4 hours
**Priority**: MEDIUM

---

## Implementation Order

1. **PHASE 1** - Message Reply System (Foundation)
2. **PHASE 2** - Sidebar Navigation (Quick Win)
3. **PHASE 3** - AI Price in View (Core Feature)
4. **PHASE 4** - User Dashboard Messages (Quick Fix)
5. **PHASE 5** - Customer AI Integration (Enhancement)
6. **PHASE 6** - Request Buttons in View (Integration)
7. **PHASE 7** - Owner Agreements (Feature)
8. **PHASE 8** - Owner AI Price Advice (Enhancement)

---

## Total Estimated Time: 17-25 hours

---

## Success Criteria

- [ ] All message replies work correctly
- [ ] Sidebar navigation consolidated
- [ ] AI prices display in all property views
- [ ] User dashboard message buttons functional
- [ ] Customer can see AI recommendations
- [ ] Request buttons available in property view
- [ ] Owner can manage agreements
- [ ] Owner can predict prices with AI

---

## Next Steps

Ready to start with **PHASE 1: Message Reply System**?

