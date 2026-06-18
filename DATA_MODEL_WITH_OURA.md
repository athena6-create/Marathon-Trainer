# Data Model for Running Coach App (with Oura Phase 2)

## Tables

### `users`
```
id: uuid (primary key)
email: string (unique)
name: string
created_at: timestamp
updated_at: timestamp
```

### `athlete_profile`
```
id: uuid (primary key)
user_id: uuid (foreign key → users.id)
age: integer
goals: string (e.g., "5K in 25 min, then half-marathon")
current_run_level_jog_minutes: integer
current_run_level_jog_seconds: integer
current_run_level_walk_minutes: integer
current_run_level_walk_seconds: integer
current_run_level_reps_min: integer
current_run_level_reps_max: integer
preferred_jog_speed_mph: float (e.g., 4.6)
preferred_walk_speed_mph: float (e.g., 3.0)
hr_backoff_threshold: integer (default 170 bpm)
notes: text
oura_access_token: string (encrypted, null until Phase 2)
oura_refresh_token: string (encrypted, null until Phase 2)
oura_user_id: string (Oura's user ID, null until Phase 2)
oura_synced_at: timestamp (null until Phase 2)
training_days_per_week: integer
created_at: timestamp
updated_at: timestamp
```

### `workouts`
```
id: uuid (primary key)
user_id: uuid (foreign key → users.id)
workout_date: date
workout_type: enum ('run', 'strength', 'mobility', 'walk_hike', 'rest', 'other')
raw_note: text (original voice/text input)
transcript: text (AI-generated transcript of voice, or null if text input)
summary: string (AI-generated 1-2 sentence summary)
completed: boolean
duration_minutes: integer
distance_miles: float (optional)
perceived_effort: integer (1-10 scale)
readiness_before: integer (0-100, calculated)
readiness_after: integer (0-100, calculated)
oura_sleep_duration: integer (minutes, pulled from Oura in Phase 2, null in MVP)
oura_sleep_score: integer (0-100, Oura's sleep score, null in Phase 2)
oura_readiness_score: integer (0-100, Oura's readiness, null in Phase 2)
oura_resting_hr: integer (bpm, null in Phase 2)
oura_hrv: float (heart rate variability, null in Phase 2)
created_at: timestamp
updated_at: timestamp
```

### `run_details`
```
id: uuid (primary key)
workout_id: uuid (foreign key → workouts.id)
jog_minutes: integer
jog_seconds: integer
walk_minutes: integer
walk_seconds: integer
reps_planned: integer
reps_completed: integer
jog_speed_mph: float
walk_speed_mph: float
max_hr: integer
avg_hr: integer
hr_notes: string
hr_recovered_to: integer (lowest HR during walk breaks, if applicable)
hit_threshold: boolean (did HR hit 170+ bpm?)
threshold_timing: string ('early', 'middle', 'late', null)
modified: boolean
modification_notes: string
```

### `strength_details`
```
id: uuid (primary key)
workout_id: uuid (foreign key → workouts.id)
focus_area: enum ('upper', 'lower', 'mobility', 'knee_support', 'core')
exercises_json: json (array of {name, sets, reps, notes})
soreness_after: integer (1-5 scale, next-day soreness estimate)
bracing_pain: boolean (rib/core pain during exercise?)
```

Example exercises_json:
```json
[
  {"name": "wall sits", "duration_seconds": 30, "notes": "felt strong"},
  {"name": "glute bridges", "sets": 3, "reps": 10, "notes": null},
  {"name": "leg press", "sets": 3, "reps": 8, "weight_lbs": 185}
]
```

### `symptoms`
```
id: uuid (primary key)
workout_id: uuid (foreign key → workouts.id)
user_id: uuid (foreign key → users.id)
body_area: enum ('knee', 'hip', 'shin', 'calf', 'foot', 'rib', 'other')
severity: integer (0-5 scale: 0=none, 1=mild awareness, 2=mild discomfort, 3=noticeable/manageable, 4=changes form, 5=stop activity)
timing: string (e.g., 'before run', 'during rep 3', 'after workout', 'next morning')
description: string
affected_form: boolean (changed gait/technique?)
next_day_pain: boolean (still hurts the next day?)
created_at: timestamp
```

### `recommendations`
```
id: uuid (primary key)
user_id: uuid (foreign key → users.id)
triggered_by_workout_id: uuid (foreign key → workouts.id, null if system-generated)
created_at: timestamp
recommended_date: date (date this recommendation applies to)
workout_type: enum ('run', 'strength', 'mobility', 'walk_hike', 'rest', 'other')
run_prescription: json (null unless workout_type='run')
strength_prescription: json (null unless workout_type='strength')
rationale: string (coach's explanation)
readiness_score: integer (0-100 at time of recommendation)
risk_level: enum ('green', 'yellow', 'red')
user_acknowledged: boolean
user_overridden: boolean
override_notes: string (if user chose different workout)
status: enum ('pending', 'completed', 'skipped', 'overridden')
```

Example run_prescription:
```json
{
  "jog_minutes": 5,
  "jog_seconds": 0,
  "walk_minutes": 2,
  "walk_seconds": 0,
  "reps_min": 5,
  "reps_max": 6,
  "speed_mph": 4.6,
  "intensity": "easy",
  "notes": "repeat current level; HR was controlled last time"
}
```

Example strength_prescription:
```json
{
  "focus_area": "knee_support",
  "suggested_exercises": [
    "wall sits 30s x 2",
    "glute bridges 3x10",
    "band walks 3x15 each direction"
  ],
  "avoid": ["heavy squats", "StairMaster"],
  "notes": "knee pain detected; strengthen stabilizers before next run"
}
```

### `oura_daily_snapshot` (Phase 2)
```
id: uuid (primary key)
user_id: uuid (foreign key → users.id)
snapshot_date: date
sleep_duration: integer (minutes)
sleep_score: integer (0-100)
sleep_deep: integer (minutes)
sleep_light: integer (minutes)
sleep_rem: integer (minutes)
sleep_latency: integer (minutes, time to fall asleep)
readiness_score: integer (0-100, Oura's calculation)
readiness_contributors: json (Oura's breakdown)
resting_heart_rate: integer (bpm)
hrv: float (heart rate variability)
body_temperature_deviation: float (celsius)
activity_score: integer (0-100)
active_calories: integer
steps: integer
synced_at: timestamp
```

---

## Readiness Score Calculation (MVP)

Formula: `readiness = 100 - penalties`

**Penalties (subtract from 100):**
- Poor sleep: -20 points
- High soreness (next-day from strength): -15 points
- Pain 1-2: -5 points
- Pain 3+: -20 points
- Last run was hard & recent (< 48h): -10 points
- Last lower-body strength < 24h ago & sore: -15 points
- Hungover/poor fueling: -15 points
- Period symptoms (heavy/cramps): -10 points
- Subjective low energy: -10 points

**Bonuses (add to score):**
- Great sleep: +10 points
- User reports "feeling great": +10 points

**Result bands:**
- 80–100: **Green** — progress allowed if no pain
- 60–79: **Normal** — repeat current workout
- 40–59: **Yellow** — downgrade workout
- 0–39: **Red** — rest/walk/mobility only

---

## Readiness Score Calculation (Phase 2 + Oura)

When Oura data is available, use it directly:

```
readiness = (base_score * 0.6) + (oura_readiness * 0.4)
```

Where `base_score` is the MVP calculation above, and `oura_readiness` is Oura's own readiness score (0-100).

Oura data that feeds in:
- **Sleep duration & quality**: Replaces manual "I slept poorly" input
- **HRV**: Adds +5 if high HRV, -5 if low HRV (relative to user's baseline)
- **Resting HR**: If elevated vs. baseline, -5 to -10
- **Oura readiness**: Contributes 40% to final readiness

---

## Oura Phase 2 Integration Plan

### OAuth Flow
1. User clicks "Connect Oura Ring" in settings
2. Redirects to Oura's OAuth endpoint
3. User grants permission to read sleep, activity, readiness
4. Store `oura_access_token`, `oura_refresh_token`, `oura_user_id` in `athlete_profile`
5. Set up background job to sync Oura data daily

### Data Sync
- **On login**: Check if Oura token exists; if yes, pull yesterday's data
- **Daily job** (e.g., 6 AM UTC): Pull previous day's Oura snapshot
- Store in `oura_daily_snapshot` table
- On recommendation, check if Oura data exists for that date; if yes, use it; if no, fall back to manual input

### API Endpoints (Phase 2)
- `GET /api/oura/auth` — Start OAuth flow
- `GET /api/oura/callback?code=...` — Handle OAuth callback
- `POST /api/oura/sync` — Manually trigger sync
- `GET /api/oura/status` — Check if connected and last sync time

---

## Notes for MVP Build

- Mark all Oura fields as **nullable** (null in MVP)
- In readiness calculation, if Oura fields are null, ignore them (use MVP formula only)
- In Phase 2, populate Oura fields and update readiness calculation to blend both sources
- The data model is future-proof; MVP just ignores the Oura columns

