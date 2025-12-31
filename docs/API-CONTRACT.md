# API Contract

**Last Updated:** 2025-12-31
**Status:** Core endpoints (2) + PULP endpoints (7) + Betting Timer System implemented

---

## Scorecard Processing

### POST /api/processScorecard

Process scorecards from Gmail. Executes 14-step workflow: email polling → image extraction → Claude Vision → validation → event assignment → scoring → player validation → config loading → points calculation → database storage → notifications → PULP processing → bet/challenge resolution → **betting lock auto-reset**.

**Request:**
```json
{
  "emailFrom": "optional@email.com",
  "maxEmails": 5,
  "skipNotifications": false
}
```

**Parameters:**
- `emailFrom` (optional): Filter emails from specific sender
- `maxEmails` (optional): Max emails to process per run (default: 5)
- `skipNotifications` (optional): Skip sending email notifications (default: false)

**Success Response (200):**
```json
{
  "success": true,
  "results": {
    "processed": [
      {
        "emailId": "string",
        "round": { "id": 123, "course_name": "Bryant Lake" },
        "playerRounds": [...],
        "event": { "id": 1, "name": "Season 2025" },
        "scorecardData": {...},
        "playerValidation": {...},
        "configuration": {...}
      }
    ],
    "failed": [
      {
        "emailId": "string",
        "from": "email@domain.com",
        "subject": "Scorecard",
        "error": "Error message"
      }
    ],
    "skipped": [],
    "stats": {
      "emailsChecked": 3,
      "successful": 2,
      "failed": 1,
      "skipped": 0
    }
  },
  "timestamp": "2025-12-23T12:00:00.000Z"
}
```

**Error Response (500):**
```json
{
  "success": false,
  "error": "Error message",
  "timestamp": "2025-12-23T12:00:00.000Z"
}
```

**Triggers:**
- Vercel Cron Job (automated polling)
- Manual trigger from dashboard
- Local testing/development

---

## Podcast Generation

### POST /api/generatePodcast

Generate monthly podcast episode with AI hosts discussing recent rounds, rivalries, and highlights. Runs podcast generator script, generates audio with ElevenLabs TTS, uploads to GitHub releases.

**Request:**
```json
{}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Podcast generated successfully",
  "logs": "Script execution logs..."
}
```

**Error Response (500):**
```json
{
  "success": false,
  "error": "Podcast generation failed",
  "logs": "Error logs..."
}
```

**Timeout Response (408):**
```json
{
  "success": false,
  "error": "Podcast generation timed out (10 min limit)"
}
```

**Triggers:**
- Vercel Cron Job (monthly on 1st)
- Manual trigger from dashboard

**Notes:**
- 10 minute timeout limit
- Runs as child process
- Requires GitHub token for release upload
- Uses ElevenLabs API for TTS

---

## PULP Economy Endpoints

### POST /api/pulp/placeBet

Place bet on top 3 predictions for **next round**. Deducts wager immediately. Bet resolves when next scorecard is processed.

**Authentication:** Required (Bearer token in Authorization header)

**Request:**
```json
{
  "roundId": null,
  "eventId": "uuid",
  "predictions": {
    "first": "Player Name",
    "second": "Player Name",
    "third": "Player Name"
  },
  "wagerAmount": 20
}
```

**Note:** `roundId` should always be `null` for "next round" betting. The bet will automatically resolve to the next round when a scorecard is processed.

**Success Response (200):**
```json
{
  "success": true,
  "bet": {
    "id": "uuid",
    "player_id": 123,
    "round_id": "uuid",
    "event_id": "uuid",
    "predictions": {...},
    "wager_amount": 20,
    "status": "pending",
    "created_at": "2025-12-26T12:00:00.000Z"
  }
}
```

**Error Responses:**
- `400`: Insufficient PULPs, betting locked, invalid predictions
- `401`: Unauthorized (missing/invalid token)
- `500`: Internal server error

**Validation Rules:**
- `roundId` must be `null` (next round betting only)
- Minimum wager: 20 PULPs
- Maximum wager: player's current balance
- All 3 predictions must be different players
- Betting must not be locked for event (check `events.betting_lock_time`)

---

### POST /api/pulp/issueChallenge

Issue head-to-head challenge to another player for **next round**. Deducts wager immediately.

**Authentication:** Required

**Request:**
```json
{
  "challengedId": 456,
  "roundId": null,
  "wagerAmount": 50
}
```

**Note:** `roundId` should always be `null` for "next round" challenges. Challenge resolves when both players participate in the next round.

**Success Response (200):**
```json
{
  "success": true,
  "challenge": {
    "id": "uuid",
    "challenger_id": 123,
    "challenged_id": 456,
    "round_id": "uuid",
    "wager_amount": 50,
    "status": "pending",
    "issued_at": "2025-12-26T12:00:00.000Z"
  }
}
```

**Error Responses:**
- `400`: Insufficient PULPs, min wager not met, invalid round
- `401`: Unauthorized
- `500`: Internal server error

**Validation Rules:**
- `roundId` must be `null` (next round challenges only)
- Minimum wager: 20 PULPs
- Both players must have sufficient balance
- Cannot challenge yourself
- Challenger must be ranked lower than challengee (season leaderboard)

---

### POST /api/pulp/respondToChallenge

Accept or reject a pending challenge. Reject pays 50% cowardice tax.

**Authentication:** Required

**Request:**
```json
{
  "challengeId": "uuid",
  "accept": true
}
```

**Success Response (200):**
```json
{
  "success": true,
  "challenge": {
    "id": "uuid",
    "status": "accepted",
    "updated_at": "2025-12-26T12:00:00.000Z"
  }
}
```

**Error Responses:**
- `400`: Challenge not found, already responded, insufficient PULPs (accept)
- `401`: Unauthorized
- `500`: Internal server error

**Business Logic:**
- Accept: Deducts wager from challengee, challenge active for next round
- Reject: Deducts 50% of wager as cowardice tax, challenge cancelled

---

### POST /api/pulp/purchaseAdvantage

Purchase advantage from catalog. Expires in 24 hours. One per type limit.

**Authentication:** Required

**Request:**
```json
{
  "advantageKey": "mulligan"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "advantage": {
    "advantage_key": "mulligan",
    "purchased_at": "2025-12-26T12:00:00.000Z",
    "expires_at": "2025-12-26T23:59:59.000Z",
    "used_at": null
  },
  "catalogEntry": {
    "name": "Mulligan",
    "pulp_cost": 120
  }
}
```

**Error Responses:**
- `400`: Insufficient PULPs, already owns this type, advantage not found
- `401`: Unauthorized
- `500`: Internal server error

**Available Advantages:**
- `mulligan` - 120 PULPs
- `anti_mulligan` - 200 PULPs
- `cancel` - 200 PULPs
- `bag_trump` - 100 PULPs
- `shotgun_buddy` - 100 PULPs

---

### POST /api/pulp/lockBetting

Admin endpoint to lock betting for an event. Prevents new bets, finalizes pending bets.

**Note:** Betting lock is primarily managed via the **Betting Controls UI** (Admin dropdown → Betting Controls), which provides timer preview, extend, and cancel functionality. This API endpoint is available but rarely used directly.

**Authentication:** Required (admin access - currently all authenticated users)

**Request:**
```json
{
  "eventId": "uuid"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "betsLocked": 15,
  "lockTime": "2025-12-26T12:00:00.000Z"
}
```

**Error Responses:**
- `400`: Event not found, already locked
- `401`: Unauthorized
- `500`: Internal server error

**Business Logic:**
- Sets `events.betting_lock_time` to current timestamp
- Updates all pending bets for event to status='locked'
- Prevents new bets from being placed
- **UI Features:**
  - Betting Controls page: Set round time → auto-calculates lock time (round + 15 min) → Lock/Extend/Cancel buttons
  - Betting page: Animated countdown timer showing time until lock → Pulsating "Locked" state after lock time
  - Auto-reset: Lock clears when scorecard is processed for locked round (Step 14 of processScorecard workflow)

---

### GET /api/pulp/getBalance

Get player's PULP balance and stats.

**Authentication:** Required

**Request:** No body (player derived from auth token)

**Success Response (200):**
```json
{
  "success": true,
  "balance": 250,
  "stats": {
    "totalEarned": 500,
    "totalSpent": 250,
    "activeBets": 3,
    "activeChallenges": 1,
    "activeAdvantages": 2
  }
}
```

**Error Responses:**
- `401`: Unauthorized
- `500`: Internal server error

---

### GET /api/pulp/getTransactions

Get player's PULP transaction history.

**Authentication:** Required

**Query Parameters:**
- `limit` (optional): Number of transactions to return (default: 20, max: 100)
- `offset` (optional): Pagination offset (default: 0)

**Success Response (200):**
```json
{
  "success": true,
  "transactions": [
    {
      "id": "uuid",
      "player_id": 123,
      "amount": 10,
      "transaction_type": "round_placement",
      "description": "Round participation",
      "balance_after": 260,
      "created_at": "2025-12-26T12:00:00.000Z",
      "metadata": {}
    }
  ],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "total": 45
  }
}
```

**Error Responses:**
- `401`: Unauthorized
- `500`: Internal server error

**Transaction Types:**
- `round_placement`: Round participation (+10)
- `streak_bonus`: 4-week streak (+20)
- `beat_higher_ranked`: Beat higher-ranked players (+5 each)
- `drs_bonus`: Position-based bonus (+2/4/6/8...)
- `weekly_interaction`: First action of week (+5)
- `bet_win`: Bet payout (2x or 1x)
- `bet_loss`: Bet wager deduction
- `challenge_win`: Challenge victory (2x wager)
- `challenge_loss`: Challenge defeat
- `challenge_reject`: Cowardice tax (50% wager)
- `advantage_purchase`: Advantage cost deduction

---

## Supabase Direct Operations (Frontend)

The Admin Control Center uses Supabase JS client directly for CRUD operations instead of dedicated API endpoints.

### Events Table

**Select events:**
```javascript
const { data, error } = await supabase
  .from('events')
  .select('*')
  .order('start_date', { ascending: false })
```

**Create event:**
```javascript
const { data, error } = await supabase
  .from('events')
  .insert([{ name, start_date, end_date, type, status, points_system_id, year }])
  .select()
```

**Update event:**
```javascript
const { error } = await supabase
  .from('events')
  .update({ name, start_date, end_date, type, status, points_system_id, year })
  .eq('id', eventId)
```

**Delete event:**
```javascript
const { error } = await supabase
  .from('events')
  .delete()
  .eq('id', eventId)
```

### Event Players Table (Junction)

**Select event players:**
```javascript
const { data, error } = await supabase
  .from('event_players')
  .select('event_id, player_id')
```

**Add player to event:**
```javascript
const { error } = await supabase
  .from('event_players')
  .insert([{ event_id, player_id }])
```

**Remove player from event:**
```javascript
const { error } = await supabase
  .from('event_players')
  .delete()
  .eq('event_id', eventId)
  .eq('player_id', playerId)
```

**Bulk insert event players:**
```javascript
const eventPlayerRecords = selectedPlayerIds.map(playerId => ({
  event_id: eventId,
  player_id: playerId
}))
const { error } = await supabase
  .from('event_players')
  .insert(eventPlayerRecords)
```

### Players Table

**Select active players:**
```javascript
const { data, error } = await supabase
  .from('registered_players')
  .select('id, player_name')
  .order('player_name', { ascending: true })
```

**Note:** No filter on `status` to show all players, or filter with `.eq('status', 'active')` for active only.

### Points Systems Table

**Select points systems:**
```javascript
const { data, error } = await supabase
  .from('points_systems')
  .select('*')
  .order('name', { ascending: true })
```

**Update points system config:**
```javascript
const updatedConfig = {
  rank_points: { '1': 10, '2': 7, '3': 5, 'default': 2 },
  performance_points: { birdie: 1, eagle: 3, ace: 5, most_birdies: 20 },
  tie_breaking: { priority: ['aces', 'eagles', 'birdies', 'earliest_birdie'] },
  course_multiplier: { enabled: true, source: 'course_tier' }
}

const { error } = await supabase
  .from('points_systems')
  .update({ config: updatedConfig })
  .eq('id', systemId)
```

**Create points system:**
```javascript
const { error } = await supabase
  .from('points_systems')
  .insert([{ name, description, config }])
```

**Delete points system:**
```javascript
const { error } = await supabase
  .from('points_systems')
  .delete()
  .eq('id', systemId)
```

---

## Error Response Format (All Endpoints)

**Standard Error Schema:**
```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Human-readable message",
  "details": {
    // Optional additional context
  }
}
```

**Common Error Codes:**
- `VALIDATION_ERROR` - Input validation failed
- `INVALID_CREDENTIALS` - Auth failed
- `UNAUTHORIZED` - No/invalid token
- `FORBIDDEN` - Valid token, insufficient permissions
- `NOT_FOUND` - Resource doesn't exist
- `INTERNAL_ERROR` - Server error
- `EXTERNAL_API_ERROR` - Third-party API failure (Gmail, Claude, ElevenLabs)
- `DATABASE_ERROR` - Supabase operation failed
- `TIMEOUT` - Operation exceeded time limit
