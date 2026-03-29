# PHASE 1 & 2: Message Reply System + Sidebar Consolidation

## PHASE 1: Message Reply System ✅ (ALREADY PARTIALLY DONE)

### Current Status
- Reply button exists in Messages.js
- Reply modal exists
- Reply form exists
- Backend endpoint exists

### What's Missing
1. Database table for tracking reply chains
2. Backend endpoint to fetch reply threads
3. Display reply threads in UI
4. Mark replies as read

### Implementation Tasks

#### Task 1.1: Create message_replies table
```sql
CREATE TABLE IF NOT EXISTS message_replies (
  id INT PRIMARY KEY AUTO_INCREMENT,
  parent_message_id INT NOT NULL,
  reply_message_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_message_id) REFERENCES messages(id) ON DELETE CASCADE,
  FOREIGN KEY (reply_message_id) REFERENCES messages(id) ON DELETE CASCADE,
  INDEX idx_parent (parent_message_id),
  INDEX idx_reply (reply_message_id)
);
```

#### Task 1.2: Update backend to track replies
- Modify POST /api/messages to create message_replies entry
- Add GET /api/messages/:messageId/replies endpoint
- Add GET /api/messages/:messageId/thread endpoint

#### Task 1.3: Update frontend to display reply threads
- Fetch and display replies in message detail view
- Show reply chain with indentation
- Display reply count badge

#### Task 1.4: Add reply notification
- Create notification when message is replied to
- Show "New Reply" badge

---

## PHASE 2: Sidebar Navigation Consolidation ✅ (MOSTLY DONE)

### Current Status
- Sidebar already has messages link for all roles
- Messages button exists below profile in some dashboards

### What Needs to Be Done
1. Find and remove duplicate messages button from dashboards
2. Verify sidebar messages link works on all dashboards
3. Add notification badge to sidebar messages
4. Test on all dashboard types

### Implementation Tasks

#### Task 2.1: Identify duplicate messages buttons
- Check Dashboard.js
- Check OwnerDashboard.js
- Check CustomerDashboard.js
- Check PropertyAdminDashboard.js
- Check SystemAdminDashboard.js
- Check BrokerDashboardEnhanced.js
- Check CustomerDashboardEnhanced.js

#### Task 2.2: Remove duplicate buttons
- Remove messages button from below profile line
- Keep only sidebar messages link

#### Task 2.3: Add notification badge to sidebar
- Show unread count on sidebar messages link
- Update badge in real-time
- Pulse animation for unread

#### Task 2.4: Test navigation
- Test on all dashboard types
- Verify messages page loads correctly
- Verify unread count updates

---

## Implementation Order

1. **PHASE 1.1**: Create message_replies table
2. **PHASE 1.2**: Update backend endpoints
3. **PHASE 1.3**: Update frontend UI
4. **PHASE 1.4**: Add notifications
5. **PHASE 2.1**: Identify duplicate buttons
6. **PHASE 2.2**: Remove duplicates
7. **PHASE 2.3**: Add sidebar badge
8. **PHASE 2.4**: Test all dashboards

---

## Files to Modify

### Database
- `database/PHASE_1_2_SCHEMA.sql` (NEW)

### Backend
- `server/routes/messages.js` (UPDATE)

### Frontend
- `client/src/components/Messages.js` (UPDATE)
- `client/src/components/Sidebar.js` (UPDATE)
- `client/src/components/Dashboard.js` (UPDATE)
- `client/src/components/OwnerDashboard.js` (UPDATE)
- `client/src/components/CustomerDashboard.js` (UPDATE)
- `client/src/components/PropertyAdminDashboard.js` (UPDATE)
- `client/src/components/SystemAdminDashboard.js` (UPDATE)
- `client/src/components/BrokerDashboardEnhanced.js` (UPDATE)
- `client/src/components/CustomerDashboardEnhanced.js` (UPDATE)

---

## Success Criteria

- [ ] Reply threads display correctly
- [ ] Reply notifications work
- [ ] Duplicate messages buttons removed
- [ ] Sidebar messages link works on all dashboards
- [ ] Unread badge shows on sidebar
- [ ] All tests pass

---

## Estimated Time: 3-4 hours

