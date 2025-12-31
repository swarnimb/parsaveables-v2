# Podcast Notification Badge Feature

## ✅ How It Works

### **Badge Display**
- Shows unread podcast count on the **Podcast icon** in bottom navigation
- Red badge with white number (e.g., "2" or "9+" for 10+)
- Similar to notification bell badge

### **When Badge Appears**
- When new podcast episodes are published
- When user hasn't visited the Podcast page since new episode(s) were added

### **When Badge Disappears**
- Automatically when user visits `/podcast` page
- All current episodes marked as "read" in localStorage

---

## 🔧 Technical Implementation

### **1. Hook: `usePodcastNotifications`**
Location: `src/hooks/usePodcastNotifications.js`

**What it does:**
- Fetches all published episodes from database
- Compares with seen episode IDs in localStorage
- Returns unread count
- Provides `markAllAsRead()` function

**Storage key:** `parsaveables_podcast_seen`

**Example localStorage:**
```json
["episode-uuid-1", "episode-uuid-2", "episode-uuid-3"]
```

---

### **2. Bottom Navigation Badge**
Location: `src/components/layout/BottomNav.jsx`

**Changes:**
- Imports `usePodcastNotifications` hook
- Shows badge on Podcast icon when `unreadCount > 0`
- Badge displays count (max "9+")

**Badge styling:**
```jsx
<span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
  {unreadCount > 9 ? '9+' : unreadCount}
</span>
```

---

### **3. Podcast Page - Mark as Read**
Location: `src/pages/Podcast.jsx`

**Changes:**
- Imports `usePodcastNotifications` hook
- Calls `markAllAsRead()` when episodes are fetched
- Saves all episode IDs to localStorage as "seen"

**Flow:**
1. User visits `/podcast`
2. Episodes fetch from database
3. `markAllAsRead()` called automatically
4. All episode IDs saved to localStorage
5. Badge disappears from bottom nav

---

## 📊 User Experience Flow

### **Scenario 1: New Episode Published**

1. **Feb 1, 2026:** GitHub Actions generates Episode 2
2. **User opens app:** Sees badge "1" on Podcast icon
3. **User taps Podcast:** Badge disappears
4. **User listens to episode:** Enjoys Annie & Hyzer banter

### **Scenario 2: Multiple Unread Episodes**

1. User hasn't visited Podcast page in 3 months
2. 3 new episodes published (Episodes 2, 3, 4)
3. Badge shows "3"
4. User visits Podcast page
5. Badge disappears immediately
6. All 3 episodes marked as "read"

### **Scenario 3: Returning User**

1. User visited Podcast yesterday (Episode 2 read)
2. Today Episode 3 publishes
3. Badge shows "1"
4. Only Episode 3 is unread

---

## 🎨 Visual Design

**Badge appearance:**
- Position: Top-right corner of Podcast icon
- Size: 20px × 20px circle
- Background: Primary color (same as accent color)
- Text: Primary foreground (white on dark theme)
- Font: 10px bold
- Max display: "9+" for 10 or more episodes

**Matches notification bell badge styling for consistency.**

---

## 🔍 Edge Cases Handled

### **Guest Users**
- ✅ Works the same (uses localStorage, not user account)
- Guests can see unread badges
- Badge state persists in browser

### **No Episodes Yet**
- ✅ No badge shown
- Hook returns `unreadCount: 0`

### **localStorage Cleared**
- ✅ All episodes show as unread again
- User visits page → all marked as read

### **Multiple Devices**
- ⚠️ Badge state is per-device (localStorage)
- Marking as read on phone doesn't sync to desktop
- **Future enhancement:** Could use database table if needed

---

## 🚀 Future Enhancements (Optional)

### **Database-Backed Read Status**
Instead of localStorage, could use:
```sql
CREATE TABLE podcast_reads (
  user_id UUID REFERENCES auth.users(id),
  episode_id UUID REFERENCES podcast_episodes(id),
  read_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, episode_id)
);
```

**Pros:**
- Syncs across devices
- Track when episodes were read

**Cons:**
- More complex
- Requires user to be logged in
- Doesn't work for guests

**Current localStorage approach is simpler and works for all users.**

---

## ✅ Testing

### **Manual Testing:**

1. **Test Badge Appears:**
   - Delete test Episode 2 from database
   - Wait until Feb 1, 2026 for Episode 2 to generate
   - Or manually generate an episode
   - Badge should show "1"

2. **Test Badge Disappears:**
   - Visit `/podcast` page
   - Badge should disappear immediately

3. **Test Badge Count:**
   - Manually create 3 test episodes
   - Clear localStorage: `localStorage.removeItem('parsaveables_podcast_seen')`
   - Badge should show "3"
   - Visit page → badge gone

4. **Test 9+ Display:**
   - Create 10+ episodes (unlikely in real use)
   - Badge should show "9+"

---

## 📝 Summary

**What was added:**
- ✅ Custom hook for tracking unread episodes
- ✅ Badge on Podcast icon in bottom nav
- ✅ Auto-mark as read when visiting page
- ✅ localStorage persistence
- ✅ Works for both logged-in users and guests

**User benefit:**
- Know when new episodes are available
- Never miss a new podcast drop
- Visual cue similar to other notifications

**Fully implemented and ready to use!** 🎉
