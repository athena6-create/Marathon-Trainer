# Running Coach App — Product Requirements Document v2

**Status**: Active  
**Version**: 2.0  
**Last Updated**: 2026-06-17  
**Owner**: Ishi Tripathi  
**Tech Stack**: Next.js (TypeScript) + React + Tailwind CSS + Supabase  
**Release Target**: MVP by 2026-08-15

---

## 1. Problem Statement

Build a personalized hybrid running + strength training coach app that helps a beginner runner:
- Progress from run/walk intervals toward continuous running
- Work toward a 5K goal, then eventually a half-marathon
- Manage real-life constraints (full-time job, injury history, menstrual cycle, travel)
- Adapt training in real-time based on actual performance and recovery
- Prevent injury through conservative, rule-based recommendations
- Feel coached, not abandoned to generic training plans

**Core Need**: After every workout, the app transcribes a voice note, extracts what happened, and recommends the next session—adapting for real life, not forcing a pre-written schedule.

---

## 2. User Profile

**Primary User**: Ishi (the sole user)
- Beginner runner (~1.5 months into running)
- Female (menstrual cycle affects training capacity)
- Full-time job (limited weekly training hours)
- Owns: Oura Ring (active subscription), Strava account (free tier)
- Uses treadmill for base training
- Has history of rib injury (healed but tracked)
- Occasional knee discomfort below kneecap
- Currently running: 5:00 jog / 2:00 walk intervals at ~4.6 mph

**Training Context**:
- Started with 2:00 jog / 2:00 walk intervals
- Progressed to current 5:00 jog / 2:00 walk x5–6
- Successfully tested 6:00 jog / 2:00 walk but borderline effort
- HR target: mostly Zone 2 / low Zone 3
- Uses 170 bpm as practical "back off" threshold
- Recovers to 120s during walk breaks (good sign)

**Goals**:
- Complete 5K comfortably
- Progress toward half-marathon
- Train without injury or burnout
- Build sustainable running identity

---

## 3. Success Metrics

**Primary Goal**: Consistent progressive training toward 5K, then half-marathon, with zero re-injuries.

**Supporting Metrics**:
- Complete 80%+ of recommended workouts
- Rib stays healthy (no re-injury)
- Knee/hip discomfort stays manageable
- Readiness score guides next-day decisions effectively
- User feels coached and supported, not micromanaged
- App recommendations feel appropriate in retrospect (user retrospective feedback)

---

## 4. Core User Flow

1. User completes a workout outside the app (treadmill or outdoor run).
2. User opens app and taps "Log Workout."
3. User either **records a voice note** or **types text**:
   - Example: "I did 5-minute jog, 2-minute walk x5 at 4.6 mph. HR stayed in the 150s for the first two reps, then hit 170 in the last rep. I felt good and could have done more."
4. **App transcribes** voice note (if needed) and shows the transcript. User can edit or re-record.
5. **App extracts structured data** via OpenAI:
   - Workout type (run, strength, mobility, walk, rest, other)
   - Run details: jog/walk durations, speeds, reps, HR data
   - Recovery signals: sleep quality, soreness, pain, period context
   - Effort and modifications
6. **User reviews extracted data** on confirmation screen. Can edit any field before saving.
7. **App saves the workout** and calculates readiness score for the next day.
8. **App shows recommendation**: "Your next run should be…" with rationale and what to watch for.
9. **User views dashboard** showing:
   - Today's recommended workout
   - Recovery/readiness status
   - Current run level
   - Recent warning flags (injury, HR spikes, sleep debt)
   - Next planned progression

---

## 5. Core Features (MVP)

### 5.1 Workout Logging & Voice Transcription
- Voice note recording (browser Web Audio API)
- OpenAI Whisper API for transcription
- User review and edit of transcript
- Text input as alternative to voice
- Confirmation screen with extracted structured data (editable)
- Save to Supabase

### 5.2 AI-Powered Data Extraction
- OpenAI API with JSON schema prompt
- Extract: workout type, run details, strength details, recovery signals, symptoms, coach observations
- Schema: See DATA_MODEL_WITH_OURA.md for extraction JSON structure
- Fallback: User can manually edit any field

### 5.3 Rule-Based Recommendation Engine
- Stateful, explicit decision rules (not neural network)
- Calculate readiness score from 0–100 based on:
  - Sleep quality
  - Soreness from recent workouts
  - Pain flags (body area, severity)
  - Last run difficulty and recency
  - Last lower-body strength session
  - Alcohol/hangover
  - Period/cycle symptoms
  - Subjective energy
  - Recent training load
- Readiness bands guide recommendation:
  - 80–100: **Green** — progress allowed if no pain
  - 60–79: **Normal** — repeat current workout
  - 40–59: **Yellow** — downgrade workout
  - 0–39: **Red** — rest/walk/mobility only
- Generate next workout with specific prescription (interval, speed, focus area)
- Explain rationale and what to watch for

### 5.4 Progressive Run/Walk Interval Prescriptions
- Represent running level as: `{jog_min, jog_sec, walk_min, walk_sec, reps_min, reps_max, speed_mph}`
- Examples:
  - 2:00 jog / 2:00 walk x 8–10 at 4.2 mph
  - 5:00 jog / 2:00 walk x 5–6 at 4.6 mph
  - 6:00 jog / 2:00 walk x 4–5 at 4.5 mph
  - 20:00 continuous easy jog at 4.6 mph
  - 30:00 continuous easy jog at 4.5 mph
- Progression rules (only advance if):
  - Last workout completed successfully
  - HR mostly controlled (didn't repeatedly hit 170 early)
  - No meaningful pain
  - Next-day soreness manageable
  - Readiness is green or high-normal
  - Current interval pattern repeated successfully 2+ times

### 5.5 Strength Training Recommendations
- Categories: upper body, lower body, mobility, knee support, core
- Support specific exercises with sets/reps/notes
- Recommend when to do strength based on run schedule
- Track soreness after strength so next run is adjusted
- Example recommendations:
  - "Upper body day: rows, press, dips"
  - "Knee support: wall sits, glute bridges, band walks"
  - "Mobility: hip flow, calf stretches, quad stretch"

### 5.6 Pain & Injury Tracking
- Track pain in: knee, hip, shin, calf, foot, rib, other
- Severity scale: 0 (none) to 5 (stop activity)
- Track: onset timing, description, whether it changes form, whether it persists next day
- Rules:
  - Pain 0–2 improving during warm-up: monitor
  - Pain 3+ or recurring: downgrade next workout
  - Pain 4+ (changes form): allow save but flag heavily + warn
  - Pain lasting into next day: downgrade next run
  - Below-kneecap pain: trigger knee-support recommendations, avoid progression

### 5.7 Dashboard
- **Next Workout Card**: Today's recommended workout with rationale
- **Readiness Score**: 0–100 with color (green/yellow/red)
- **Current Run Level**: Display as human-readable string (e.g., "5:00 jog / 2:00 walk x5–6 at 4.6 mph")
- **Recent Workout Summary**: Last 3 workouts with outcomes
- **Warning Flags**: Injury red flags, HR spikes, sleep debt, soreness levels
- **Next Progression**: When should we expect to advance? What's the next milestone?

### 5.8 Workout History (MVP Minimal)
- Timeline view of recent workouts (last 10–20)
- Quick view: date, type, how it went, readiness, recommendation
- Expandable for details (HR data, pain flags, notes)
- Search/filter by workout type (run, strength, mobility)

### 5.9 Profile Settings
- Athlete name, age, goals
- Current run level (editable)
- Preferred jog/walk speeds
- HR threshold (default 170 bpm)
- Training days per week
- Edit/manage Oura connection (Phase 2)

### 5.10 Safety Disclaimers
- "This app is not a doctor. If you experience chest pain, fainting, sharp pain, or pain that persists and worsens, stop exercising and seek medical care."
- Displayed on first login and workout log confirmation

---

## 6. Tech Stack

- **Frontend**: Next.js (TypeScript) + React + Tailwind CSS
- **Backend**: Next.js API routes (serverless) or Supabase Edge Functions
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth (email/password or OAuth)
- **Storage**: Supabase Storage (voice audio, transcript JSON)
- **Audio**: Web Audio API (browser recording)
- **Speech-to-Text**: OpenAI Whisper API
- **AI Extraction**: OpenAI GPT-4 (structured JSON extraction)
- **Hosting**: Vercel (Next.js) + Supabase (database)
- **Mobile-First**: Responsive design, optimized for phone use post-workout

---

## 7. Key Decisions (Made)

| Decision | Choice | Reasoning |
|----------|--------|-----------|
| Transcript Review | Show transcript first, user edits | Catch speech-to-text errors before extraction |
| Audio Storage | Delete after transcription | Save storage costs; keep only transcript |
| Recommendations | Advisory only | User can override; app suggests not enforces |
| User Override | Yes, always allowed | User knows their body; app is coach not dictator |
| Run Level Storage | Structured fields | queryable, can calculate progression |
| Multi-Athlete | No, one per user | Simpler MVP; user solo project |
| HR Data | Wearable + manual | Support Strava/Apple imports + manual fallback |
| Missing HR Data | Allow workout save | Recommendations possible without HR |
| Strength-Run Sync | Auto-downgrade if sore | Sore legs = adapt next run intensity |
| Strength Detail | Track specific exercises | Detailed history for debugging soreness |
| Pain Enforcement | Allow save, flag heavily | User agency; warning + strong recommendation |
| MVP Scope | Add seed data + history | Use past workouts to test recommendation engine |
| Oura Integration | Phase 2 (not MVP) | MVP uses manual sleep input; Oura ready in schema |

---

## 8. Coaching Philosophy & Tone

The app should sound like a **supportive but cautious running coach**.

**Principles**:
- Progress duration before speed
- Do not increase speed and interval duration simultaneously
- When moving to a harder pattern, reduce speed slightly at first
- Repeat a new interval pattern 2–3 times before progressing (unless very clearly easy, no pain)
- If pain appears before or during a run, downgrade the session
- If HR repeatedly hits 170 before the final minute, downgrade speed/duration
- If user slept badly, is sore, hungover, under-fueled, on a stressful day, or had recent leg day, downgrade
- If user has a great day, allow progression but don't stack multiple jumps
- Strength training should support running, not sabotage it
- Reward consistency, not hero workouts
- Knee/hip/calf/tendon soreness taken seriously

**Tone Examples**:
- "Good session. This was not a failed run—it was useful calibration. Your HR recovery was strong, but hitting 170 before the final minute suggests 6-minute reps at 4.6 are still borderline today. Next time, try 6:00/2:00 x4 at 4.5 with a full warm-up, or repeat 5:00/2:00 if sleep is poor."
- "Great news: you nailed the 5:00/2:00 reps. HR stayed controlled, you felt strong, and recovery was good. You're ready to progress. Let's try 6:00/2:00 x4 at 4.5 mph next time. This will be slightly harder, but the lower speed and fewer reps will let you dial in the longer duration."
- "Yellow flag: knee discomfort today. We're holding intensity and adding knee-support work instead. Do today's recommended mobility + knee-support session. If knee pain continues tomorrow, we'll do another easy day or rest."

Avoid shaming language. Avoid over-medical diagnosis. For pain, say "this is a yellow flag" and recommend backing off or seeking professional help if severe/persistent.

---

## 9. Recommendation Engine Rules

### 9.1 Readiness Score Calculation (MVP)

Formula: `readiness = 100 - penalties + bonuses`

**Penalties**:
- Poor sleep (< 6 hours or low quality): -20 points
- High soreness (next-day from strength): -15 points
- Pain 1–2 (mild): -5 points
- Pain 3+ (noticeable/manageable): -20 points
- Last run was hard & recent (< 48h ago): -10 points
- Last lower-body strength < 24h ago & sore: -15 points
- Hungover / poor fueling: -15 points
- Period symptoms (heavy/cramps): -10 points
- Subjective low energy: -10 points

**Bonuses**:
- Great sleep (> 7 hours, feeling rested): +10 points
- User reports "feeling great": +10 points

**Bands**:
- 80–100: **Green** — progress allowed if no pain
- 60–79: **Normal** — repeat current workout
- 40–59: **Yellow** — downgrade workout
- 0–39: **Red** — rest/walk/mobility only

### 9.2 Progression Rules

**Advance when**:
- Last workout completed successfully
- HR mostly controlled (didn't repeatedly hit 170 early)
- No meaningful pain
- Next-day soreness manageable
- Readiness is green or high-normal (≥70)
- Current interval pattern repeated 2+ times successfully, unless latest was exceptionally easy

**Downgrade when**:
- Poor sleep (< 6 hours)
- Still sore from leg day
- Knee/hip/shin/calf pain present
- HR hit 170 too early (before final minute of multiple intervals)
- User felt stiff, breathing harder than normal, or modified downward

**Possible next recommendations**:
- Progress interval duration (add 30–60 seconds to jog)
- Repeat current pattern
- Repeat current pattern at 0.1–0.2 mph lower speed
- Shorten interval duration (step back)
- Increase walk recovery (2:00 → 2:30)
- Easy walk only
- Mobility + knee-strength day
- Lower-body strength day
- Upper-body day
- Rest day

### 9.3 HR Rules

Use 170 bpm as practical backoff threshold.

- If HR only briefly touches 170 in final 30–60 seconds of final interval: acceptable but note it
- If HR reaches 170 before last minute of multiple intervals: workout was too hard
- If HR reaches 170 early despite lower speed: downgrade next workout
- If HR recovers to 120s during walk breaks: recovery is good
- If HR doesn't drop below 140–145 by end of walk breaks: increase walk duration or downgrade

### 9.4 Pain Rules

Pain severity scale: 0 (none) → 5 (stop activity)

- 0–2 improving during warm-up: monitor
- 3+ or recurring: downgrade next workout
- 4+ (changes form): allow save but flag heavily + recommend rest
- Lasting into next day: downgrade next run
- Below kneecap: knee-support recommendations, avoid progression
- Sharp pain or sudden worsening: recommend medical evaluation

### 9.5 Strength Training Recommendations

Categories: upper, lower, mobility, knee-support, core

**During run build phase**:
- Keep lower-body moderate (not soreness-inducing)
- Use 2–3x per week upper/mobility/core
- Use 1–2x per week lower body

**For lower body**:
- Glute bridges/hip thrusts
- Leg press / goblet squat
- Romanian deadlifts
- Hamstring curls
- Calf raises
- Band walks / hip abduction
- Step-downs
- Wall sits / Spanish squat holds

**For knee support**:
- Wall sits (30–60s holds)
- Low step-downs (focus on glute activation)
- Glute bridges
- Band walks (side-to-side, lateral)
- Calf raises
- Hamstring curls
- Avoid painful deep knee flexion

**For rib (if symptoms)**:
- Avoid heavy bracing if rib pain
- Avoid hard planks, heavy presses, heavy rows if rib pain

### 9.6 Warm-Up Recommendation

Before run workouts:

**Dynamic**:
- Leg swings (forward/back, side-to-side)
- Skips (high knees, butt kicks)
- Hip circles
- Arm circles

**Treadmill**:
- 5 min walk at 3.0 mph
- 1–2 min very easy jog at 4.2–4.3 mph (optional)
- 1–2 min walk reset
- **Then start main workout**

If user reports stiff legs or HR spikes early, remind them: don't cut the warm-up short.

---

## 10. Data Model

See [DATA_MODEL_WITH_OURA.md](DATA_MODEL_WITH_OURA.md) for full schema.

**Key tables**:
- `users`: Auth + identity
- `athlete_profile`: Current run level, preferences, Oura credentials (Phase 2)
- `workouts`: Core workout log (date, type, summary, readiness before/after)
- `run_details`: Interval details, HR, speeds, modifications
- `strength_details`: Exercises, soreness, focus area
- `symptoms`: Pain tracking with severity and timing
- `recommendations`: Suggested next workout + rationale
- `oura_daily_snapshot`: Sleep, HRV, readiness (Phase 2)

**MVP approach**: All Oura fields are nullable. Phase 2 populates them and updates readiness calculation.

---

## 11. AI Extraction Schema

**Input**: Transcript or text note from user

**Output**: Structured JSON

```json
{
  "workout_type": "run | strength | mobility | walk_hike | rest | other",
  "completed": true | false,
  "summary": "1–2 sentence summary of what happened",
  "run": {
    "jog_minutes": null | number,
    "jog_seconds": null | number,
    "walk_minutes": null | number,
    "walk_seconds": null | number,
    "reps_planned": null | number,
    "reps_completed": null | number,
    "jog_speed_mph": null | number,
    "walk_speed_mph": null | number,
    "max_hr": null | number,
    "avg_hr": null | number,
    "hit_170": null | boolean,
    "threshold_timing": null | "early" | "middle" | "late",
    "hr_recovery": null | string (e.g., "recovered to 120s"),
    "modifications": null | string (e.g., "only did 4 reps instead of 5")
  },
  "strength": {
    "focus_area": null | "upper" | "lower" | "mobility" | "knee_support" | "core",
    "exercises": null | [{"name": "", "sets": null | number, "reps": null | number, "notes": null | string}],
    "intensity": null | "light" | "moderate" | "hard"
  },
  "recovery": {
    "sleep_quality": null | "poor" | "fair" | "good" | "excellent",
    "soreness": null | string (body area + severity 1-5),
    "period_context": null | string (e.g., "day 3, heavy flow"),
    "alcohol": null | boolean,
    "caffeine": null | boolean,
    "fueling": null | "under-fueled" | "adequate" | "well-fueled",
    "hydration": null | "dehydrated" | "adequate" | "over-hydrated"
  },
  "symptoms": null | [
    {
      "body_area": "knee" | "hip" | "shin" | "calf" | "foot" | "rib" | "other",
      "severity": null | number (0-5),
      "description": null | string,
      "affected_form": null | boolean,
      "timing": null | string (e.g., "during rep 3", "before run", "next morning")
    }
  ],
  "coach_observations": null | [string] (e.g., ["HR controlled well", "stiff at start"])
}
```

---

## 12. UI Screens (MVP)

### 12.1 Dashboard
- **Recommended Workout Card**: What to do today, with rationale
- **Readiness Score**: 0–100, color-coded
- **Current Run Level**: Human-readable prescription
- **Recent Workout Summary**: Last 2–3 workouts with outcomes
- **Warning Flags**: Injury alerts, sleep debt, soreness
- **Next Milestone**: When should we progress?

### 12.2 Log Workout
- **Record Voice Note**: Browser Web Audio API, "record" button
- **Upload Audio**: Alternative to live recording
- **Type Note**: Text input as fallback
- **Submit**: Sends to OpenAI for transcription + extraction

### 12.3 Review Transcript
- Show transcript of voice note
- Allow edit or re-record
- "Looks good, continue" button

### 12.4 Confirm Workout
- Display extracted fields (all editable)
- Show summary + recovery signals + symptoms
- "Save Workout" button
- After save, show recommendation

### 12.5 Recommendation Detail
- **Next Workout**: Specific prescription (e.g., "5:00 jog / 2:00 walk x5 at 4.6 mph")
- **Why**: Readiness score breakdown, coaching rationale
- **What to Watch**: "HR should recover to 120s during walk breaks"
- **When to Downgrade**: "If HR hits 170 before minute 4, stop after this rep and walk the rest"
- **Recovery Suggestion**: "Do mobility today if knee discomfort persists"

### 12.6 Workout History
- Timeline of last 10–20 workouts
- Quick view: date, type, "how it went" status, readiness, next recommendation
- Expandable for details (HR, pain flags, notes)
- Filter by type (run, strength, mobility)

### 12.7 Profile / Settings
- Athlete name, age, goals
- Current run level (editable, structured input)
- Preferred jog/walk speeds
- HR threshold
- Training days per week target
- Oura connection status (Phase 2)

---

## 13. Recommendation Examples

### Example 1
**Input**: "I did 6-minute jog, 2-minute walk x4 at 4.6. Hit 170 by minute 5 on reps 2 and 3. Slept badly and legs were stiff."

**Readiness**: Poor sleep (-20), hit 170 early (-15), stiff (-5) = ~60 (Normal)

**Recommendation**:
- **Next run**: 5:00 jog / 2:00 walk x5–6 at 4.6 (repeat previous level) OR 6:00 jog / 2:00 walk x4 at 4.4–4.5 if well rested tomorrow
- **Today/Tomorrow**: Mobility + knee support + easy walk
- **Rationale**: Sleep + stiffness likely caused HR drift; don't force progression

### Example 2
**Input**: "Did 5-minute jog, 2-minute walk x6 at 4.6. Never touched 170. Felt great. Knee fine. Slept great."

**Readiness**: Great sleep (+10), great effort, no pain (+0), controlled HR (+0) = ~90 (Green)

**Recommendation**:
- **Next run**: 6:00 jog / 2:00 walk x4 at 4.5–4.6
- **Rationale**: 5-minute intervals now controlled; ready for next progression

### Example 3
**Input**: "Knee hurt below kneecap before running, so I didn't run today."

**Readiness**: Knee pain 3+ = Red

**Recommendation**:
- **No progression**
- **If pain > 2/10**: Walk or bike only
- **Add**: Knee-support work (wall sits, glute bridges, band walks)
- **Avoid**: StairMaster, hills, speed, heavy squats/lunges

### Example 4
**Input**: "Did lower body two days ago and still sore."

**Readiness**: Sore from leg day (-15) = ~70 (Normal/Low)

**Recommendation**:
- **Next run**: Downgrade to 4:00 jog / 2:00 walk or easy walk only
- **Future lower body**: Keep RPE 5–6, avoid soreness chasing

---

## 14. Coaching Tone in Practice

**Bad recommendation** (too robotic):
"Your readiness is 65. Repeat the current pattern."

**Good recommendation** (coaching tone):
"You had solid effort yesterday, but the stiffness this morning and sketchy sleep suggest your body wants a repeater. Stick with 5:00/2:00 at 4.6 today. If your legs feel better by warm-up, you can attempt 6-minute reps, but don't force it. You're building consistency, and that's worth more than a heroic progression right now."

---

## 15. Safety & Disclaimers

**Display on first login and before saving painful workouts**:

> **Medical Disclaimer**: This app is not a doctor and cannot diagnose or treat injuries. It is designed to help you log workouts and manage training load.
>
> **Seek immediate medical care if you experience**:
> - Chest pain or pressure
> - Fainting or severe dizziness
> - Severe shortness of breath
> - Sharp, stabbing pain
> - Swelling that doesn't improve with rest
> - Pain that worsens despite rest and modification
>
> **For persistent pain** (lasting > 1 week despite modification), consult a physical therapist or doctor.

---

## 16. MVP Scope & Tasks

### MVP Goals (Weeks 1–4)
- [ ] Workout logging with voice transcription
- [ ] AI extraction to structured data
- [ ] Confirmation screen with editable fields
- [ ] Rule-based readiness score calculation
- [ ] Recommendation engine with run/strength/rest logic
- [ ] Dashboard showing next workout + readiness
- [ ] Workout history (minimal)
- [ ] Profile settings
- [ ] Seed data (past ~20 workouts for testing)
- [ ] Safety disclaimers

### MVP Does NOT Include
- Oura Ring integration (Phase 2)
- Strava import (Phase 2)
- Advanced analytics
- Sharing/export
- Native mobile app (web-first for now)

### Seed Data (Pre-launch)
Include your past ~20 workouts as test data so the recommendation engine has context and you can validate it feels right. Include:
- Successful progressions (e.g., 5:00/2:00 x5–6 at 4.6, HR controlled)
- Failed progressions (e.g., 6:00/2:00 at 4.6, HR spiked early)
- Recovery days
- Strength sessions with soreness follow-up
- Pain incidents (knee, rib)
- Sleep variation and its impact on HR

---

## 17. Phase 2 & Beyond

### Phase 2 (Oura Integration)
- Oura OAuth flow
- Auto-pull sleep, HRV, readiness daily
- Blend Oura readiness (40%) + rule-based readiness (60%)
- Resting HR tracking

### Phase 3 (Strava Integration)
- Strava OAuth flow
- Auto-pull completed runs
- Compare planned vs. actual

### Phase 4 (Advanced Features)
- Race tapering logic
- Performance analytics
- Sharing for coach review

---

## 18. Success Criteria for MVP

By week 4, the app should:
- ✓ Accept voice/text workout notes
- ✓ Transcribe and extract structured data
- ✓ Calculate readiness score accurately (user validates a few examples)
- ✓ Generate sensible next-workout recommendations
- ✓ Feel like a supportive coach (not robotic)
- ✓ Be usable on mobile (post-workout logging)
- ✓ Support manual HR input + recovery signals
- ✓ Track pain with appropriate warnings

---

## 19. Document History

- **2026-06-17**: PRD v2.0 — Complete rewrite incorporating user specifications, decision matrix, coaching philosophy, data model with Oura Phase 2 support, recommendation engine rules, and MVP task list.

---

## Appendix A: Technology Decisions Rationale

**Why Next.js + Supabase?**
- Next.js: Modern React framework, TS support, serverless, easy Vercel deploy
- Supabase: Database + auth + storage all in one; PostgreSQL at the core
- OpenAI API: Whisper for transcription, GPT-4 for structured extraction
- Tailwind: Fast styling, mobile-first, good DX

**Why rule-based recommendations over pure AI?**
- Reproducible, explainable decisions
- No hallucinations on training safety
- Easy to debug when a recommendation feels off
- User can understand why the app suggested something

**Why Oura in Phase 2, not MVP?**
- MVP needs to work without wearables (manual input OK)
- Oura auth + API adds complexity; defer until core works
- Schema designed to support it; implementation is decoupled

---

## Appendix B: Running Level Examples

```
Level 1:   2:00 jog / 2:00 walk x 8-10 @ 4.2 mph
Level 2:   2:30 jog / 2:00 walk x 8-9 @ 4.3 mph
Level 3:   3:00 jog / 2:00 walk x 8 @ 4.3 mph
Level 4:   3:00 jog / 3:00 walk x 7 @ 4.4 mph
Level 5:   4:00 jog / 2:00 walk x 6-7 @ 4.5 mph
Level 6:   5:00 jog / 2:00 walk x 5-6 @ 4.6 mph (CURRENT)
Level 7:   6:00 jog / 2:00 walk x 4-5 @ 4.5 mph
Level 8:   8:00 jog / 2:00 walk x 3 @ 4.5 mph
Level 9:   10:00 jog / 2:00 walk x 2-3 @ 4.5 mph
Level 10:  15:00 continuous easy jog @ 4.5 mph
Level 11:  20:00 continuous easy jog @ 4.5 mph
Level 12:  30:00 continuous easy jog @ 4.5 mph
Level 13:  5K easy pace (~4.7 mph for 31 min)
```

---
