# Marathon Trainer — Product Requirements Document

**Status**: Draft  
**Last Updated**: 2026-05-28  
**Owner**: Ishi Tripathi  
**Release Target**: 2026-11-28 (6 months)

---

## 1. Problem Statement

As a non-runner discovering a newfound enjoyment of running, I want to train for a half-marathon while managing:
- Limited training time (full-time job + multiple hobbies)
- Recovering from a rib injury with unpredictable flare-ups
- Menstrual cycle impacts on performance and recovery
- Frequent travel disrupting routine
- No prior running experience or identity as a runner

**Core Need**: A training program that adapts to my real life in real-time, not a static 16-week plan.

---

## 2. User Profile

**Primary User**: Ishi (the sole user)
- Non-runner transitioning to runner
- Female (menstrual cycle relevant to training)
- Full-time job (limited time for training)
- Multiple hobbies competing for time
- Recently recovered from rib injury (ongoing management needed)
- Travels frequently
- Pragmatic: wants data-driven recommendations but maintains agency (can override)
- Tech-comfortable but non-technical background
- Owns: Apple Watch, Aura Ring, Strava account

**Constraints**:
- ~6 months to train
- Limited weekly training hours (exact capacity TBD during training)
- Injury flare-ups require flexible plan adjustments
- Menstrual cycle impacts readiness (heavy days = lower intensity)

---

## 3. Success Metrics

**Primary Goal**: Complete a half-marathon at 9-minute-per-mile pace by November 28, 2026.

**Supporting Metrics**:
- Maintain rib health throughout training (no re-injury)
- Follow 80%+ of the recommended training plan
- Complete all milestone workouts (base-building, speed work, long runs)
- Finish race day feeling strong (subjective but important)

---

## 4. Core Features (MVP + Phase 1)

### 4.1 Training Plan Generation & Management
- **Generate personalized plan** based on:
  - Current fitness level (assessed via initial run/walk)
  - Available weekly training time
  - Target pace and distance (half-marathon at 9 min/mile)
  - Rib injury constraints
  - Menstrual cycle patterns
  - Travel schedule
- **Dynamic plan updates**: Plan regenerates weekly based on:
  - Completed vs. missed workouts
  - Performance data (pace, effort, recovery)
  - Injury status (rib flare-ups)
  - Life changes (travel, schedule shifts)

### 4.2 Voice-Driven Plan Adaptation
- **Voice note input**: Record requests like "my rib is flaring, reduce intensity" or "I have less time this week"
- **AI-powered drafting**: Claude API processes voice → suggests specific plan changes (frequency, duration, intensity)
- **Human approval loop**: Review suggested changes → approve or override with custom input
- **Voice note logging**: Log completed workouts, rib status, menstrual cycle day via voice

### 4.3 Rib Injury Tracking & Adaptation
- **Weekly rib check-in**: Voice note answering "How's your rib?"
- **Quantified severity**: App converts qualitative feedback into scale (1-5) for injury severity
- **Adaptive training logic**: Automatically adjusts next week's plan based on rib status
  - Day 1 flare-up → reduce impact/intensity next 2-3 days
  - Improving → gradually increase intensity
- **User override**: Accept app's recommendation or manually specify adjustments
- **Evolution tracking**: Monitor injury progression over 6 months

### 4.4 Workout Logging via Strava
- **Strava integration**: OAuth 2.0 pull completed workouts (distance, pace, duration, HR) → auto-log to app
- **Fallback**: Manual workout entry if Strava unavailable
- **Workout comparison**: Compare planned vs. actual effort/pace/distance
- **Note**: Apple Health integration dropped (requires native iOS app; web app limitation)

### 4.5 Recovery & Sleep Tracking (Oura API + Voice Backup)
- **Primary (Phase 1B)**: Oura Ring API integration (OAuth) to auto-pull:
  - Sleep duration + quality
  - HRV (Heart Rate Variability)
  - Readiness score
  - HR zone distribution from runs
- **Fallback (Phase 1)**: Manual voice note input for "How recovered do you feel?" (1-10 scale)
  - Used if Oura auth fails or as supplement to Oura data
- **Integration logic**: Oura readiness + voice input → affects next week's training intensity
- **Why Oura is high-priority**: It's the source of HR zone data since Strava free tier doesn't provide it

### 4.6 Menstrual Cycle Integration
- **Input**: Log cycle phase (or estimate from history)
- **Adaptation logic**: 
  - Heavy/cramp days → lower intensity suggestions
  - High-energy days → capitalize with harder workouts
  - Long-run scheduling: Prioritize for follicular phase when possible

### 4.6 Race Day Preparation
- **Tapering logic**: Weeks 4-6 before race, automatically reduce training volume while maintaining intensity
- **Peak week format**: Specific workout structure for final week
- **Race day plan**: Pacing strategy, fueling checklist, pre-race logistics

---

## 5. Feature Priority & Phases

### Phase 1 (MVP — Weeks 1-4)
1. Training plan generation (basic algorithm: volume + intensity progression)
2. Rib tracking + voice notes (basic speech-to-text, Claude-powered suggestions)
3. Recovery/sleep voice notes (manual input for recovery scoring)
4. Weekly plan updates (regenerate based on completed workouts + rib status)
5. Manual workout logging + HR bracket entry (fallback for when integrations unavailable)

### Phase 1B (Weeks 5-6 — HIGH PRIORITY)
1. **Oura Ring API integration** (OAuth, auto-pull sleep/HRV/HR zones) — **CRITICAL for HR data**
2. Menstrual cycle integration
3. Manual HR screenshot parsing (fallback if Oura auth fails)

### Phase 2 (Weeks 7-10)
1. **Strava integration** (OAuth 2.0 pull, auto-log distance/pace/time)
2. Improved Claude prompts for plan suggestions (more nuanced)
3. UI refinements based on early usage

### Phase 3 (Weeks 11-14)
1. Race day tapering logic
2. Advanced analytics (pace trends, injury patterns, recovery correlation)
3. Performance dashboard

### Phase 4 (Post-MVP, Future)
1. Optional sharing/export for coach review
2. Advanced analytics (pace trends, injury patterns)

---

## 6. Out of Scope (Explicitly)

- **Apple Health integration**: Requires native iOS app (architectural limitation of Flask web app)
- **Community/social features**: No Strava-like feed, no public profiles, no social sharing by default
- **Nutrition logging**: User manages independently
- **Syncing back to wearables**: App pulls data only; doesn't push plan back to Strava/Apple Watch
- **Live workout tracking**: App doesn't track a run in progress; it's for pre-run planning
- **Coaching marketplace**: Not a platform for coach discovery
- **Oura Ring integration (MVP)**: Phase 4 feature; MVP uses manual voice input for recovery

---

## 7. Key Assumptions & Risks

### Assumptions
- Claude API can reliably interpret voice notes and suggest plan changes (needs testing)
- Strava API is stable and accessible for indie developers (verified: free tier available with OAuth 2.0)
- Apple Health integration not required; Strava is sufficient for run data (revised after API research)
- 9-min/mile pace is achievable for a beginner within 6 months (realistic but aggressive)
- User will consistently log workouts + rib status + recovery for AI recommendations to work well

### Risks & Mitigation
| Risk | Impact | Mitigation |
|------|--------|-----------|
| Voice transcription errors | Bad plan suggestions | Manual review before approval; fallback to text input |
| Rib injury worsens | Can't train, goal not met | Conservative algorithm; encourage real doctor checkups |
| Strava API rate limits hit | Can't pull workouts | Cache workouts; implement rate-limit-aware retries |
| Oura API auth fails | No HR zone data | Fall back to manual HR screenshot + voice input |
| Over-reliance on AI for injury/recovery advice | Safety issue | Clear disclaimer: not medical advice; always consult doctor |

---

## 8. Technical Constraints

- **Stack**: Python (Flask backend) + PostgreSQL + React/HTML/CSS/JS frontend
- **Timeline**: 6 months to build + train (not unlimited development time)
- **Hosting**: Simple (Vercel/Railway free tier)
- **Solo builder**: User is building this while learning

---

## 9. Success Criteria for MVP

By Week 4, the app should:
- ✓ Generate a baseline 16-week training plan
- ✓ Accept manual workout logging
- ✓ Process voice notes for rib status + generate plan change suggestions
- ✓ Update plan weekly based on completed workouts
- ✓ Be runnable locally and testable

---

## 10. Open Questions & Next Steps

### API Research (Completed ✓)
- [x] Apple Health API: Requires native iOS app — **DROPPED from scope**
- [x] Strava API: Free tier available (no HR data), OAuth 2.0, ~100 req/15min — **CONFIRMED for Phase 2**
- [x] Oura Ring API: Public API, user has active subscription — **CONFIRMED for Phase 1B (HIGH PRIORITY)**

### Product Definition (Pending)
- [ ] Validate: What's the realistic range of weekly training hours given job + hobbies?
- [ ] Define: Menstrual cycle tracking method (manual input, calendar estimate, or both?)
- [ ] Define: Rib severity scale (1-5? 1-10?) and how each level maps to training adjustments
- [ ] Define: Recovery scale for voice notes (1-10? Sleep hours? Specific questions?)
- [ ] Confirm: Does user have Oura Gen2, Gen3, or Gen4? (Affects Phase 4 feasibility)

### Technical Proof-of-Concepts (Next)
- [ ] Test: Claude API voice-to-text → plan suggestions (core MVP risk)
- [ ] Test: Oura OAuth flow + data pulling (Phase 1B blocker) — **PRIORITIZE THIS**
- [ ] Test: Strava OAuth flow + activity pulling (Phase 2 blocker)

---

## 11. Document History

- **2026-05-28**: Initial PRD drafted based on vision clarification
