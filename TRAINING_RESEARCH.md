# Training Research Notes

**Purpose**: Capture public-source rationale for the first training model in the app.

---

## Product Implications

- Start with run/walk intervals instead of continuous-mile targets.
  - User is a non-runner.
  - Current preferred structure is 2-minute jog / 2-minute walk.
  - The app should progress only when the prior workout feels controlled.

- Use a weekly rhythm that alternates stress and recovery.
  - Run/walk days should not stack aggressively at the beginning.
  - Strength days support running but should not make the next run feel wrecked.
  - Recovery days are part of the plan, not failure states.

- Track simple adaptation signals before advanced integrations.
  - Rib status.
  - Recovery / sleep quality.
  - Perceived effort.
  - Optional max heart rate, with special attention to high 160s / 170s.

- Add weight training early.
  - The purpose is impact tolerance, running economy, and injury reduction.
  - Prioritize squat, hinge, single-leg, calf, carry, row, and trunk-stability patterns.

---

## Source-Backed Principles

### 1. Run/Walk Is Appropriate for Beginners

- Public beginner-running guidance commonly uses walk/run intervals to build endurance gradually.
- Couch to 5K-style plans are typically structured around 20-30 minute workouts, 3 days per week, with running intervals separated by walking recovery.
- The run/walk method is especially relevant for beginners, people returning from injury, and people trying to manage intensity.

**App decision**

- Base phase starts with:
  - 2:00 jog / 2:00 walk x 10.
  - Then gradually moves toward 3:00 jog intervals.
  - The app can repeat, regress, or progress the workout based on check-in data.

**Sources**

- [Couch to 5K overview](https://en.wikipedia.org/wiki/Couch_to_5K)
- [Women&apos;s Health: Run/Walk Method](https://www.womenshealthmag.com/fitness/a70804588/run-walk-method-how-to-beginners-and-advanced/)

---

### 2. Beginner Half-Marathon Training Needs Consistency More Than Hero Long Runs

- For beginner half-marathon prep, overall consistency and weekly volume matter more than making one long run huge.
- Long runs should not dominate weekly mileage too heavily.
- Beginner plans often need 16-20 weeks or more when starting from low running experience.

**App decision**

- Early dashboard emphasizes weekly rhythm:
  - 2-3 run/walk sessions.
  - 2 strength sessions.
  - 1-2 recovery or mobility slots.
- Long run/walk should extend conservatively, especially while rib symptoms are still a constraint.

**Source**

- [Runner&apos;s World: Minimum Long Run for Half Marathon Training](https://www.runnersworld.com/training/a70821158/half-marathon-long-run-minimum-mileage/)

---

### 3. Strength Training Should Be Part of the Running Plan

- Beginner-runner guidance commonly recommends strength training 2-3 times per week.
- Useful patterns for runners include:
  - Squat.
  - Hinge / deadlift.
  - Lunge / split squat.
  - Calf raise.
  - Core stability.
  - Rows / posture work.
- Runner-specific strength work can support running economy and reduce injury risk.

**App decision**

- MVP includes two weighted strength sessions:
  - **Strength A**: goblet squat, Romanian deadlift, step-up, calf raise, dead bug.
  - **Strength B**: split squat or reverse lunge, hip thrust or glute bridge, dumbbell row, suitcase carry, side plank.
- Strength workouts are visible on the same dashboard as running workouts.

**Sources**

- [Runner&apos;s World: Beginner Runner FAQ](https://www.runnersworld.com/beginner/a71605580/beginner-runner-faqs/)
- [Fit&Well: Four-Move Strength Workout for Runners](https://www.fitandwell.com/exercise/running/boost-power-and-stay-injury-free-with-this-four-move-strength-workout-for-runners/)
- [Time: How to Start Strength Training](https://time.com/6977409/how-to-start-strength-training/)

---

## First Training Logic

### Green-Light Check-In

- Rib: 1-3.
- Recovery: 5-10.
- Effort: 1-7.
- Max HR: below high-160s.

**Recommendation**

- Progress to the next run/walk step.

### Rib Flag

- Rib severity 4-5.
- Voice note includes terms like flare, sharp, pain, worse.

**Recommendation**

- Regress or replace next run with brisk walking / very gentle run-walk test.

### Heart-Rate Flag

- Max HR 168+.
- Voice note mentions 170 or high 160s.

**Recommendation**

- Repeat the current workout with slower jogs or longer walks.

### Recovery Flag

- Recovery 1-4.
- Voice note mentions exhausted, poor sleep, drained.

**Recommendation**

- Keep the next workout easy and cap duration.

### Effort Flag

- Effort 8-10.
- Voice note says too hard, gassed, could not finish, out of breath.

**Recommendation**

- Repeat the current run/walk step before progressing.

---

## Open Training Questions

- What weekly training time is actually realistic once work, hobbies, and travel are included?
- What rib severity scale should become the canonical product language: 1-5 or 1-10?
- Should the app eventually distinguish:
  - Run discomfort.
  - Rib pain.
  - General soreness.
  - Menstrual-cycle fatigue.
- What is the first milestone after 3:00 jog / 3:00 walk?
  - Longer total session?
  - Shorter walks?
  - One continuous 5-minute jog?
  - Controlled heart-rate cap?
