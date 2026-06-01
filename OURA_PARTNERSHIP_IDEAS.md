# Oura Partnership Ideas

**Purpose**: Strategic features & partnerships Oura should consider. Research-backed insights from building a half-marathon training app that integrates Oura data.

---

## Idea 1: Nutrition Inference Engine (Implicit Meal Tracking)

**Problem**
- Oura Meals requires manual photo-logging of every meal
- Photo quality + user error → macro miscalibration
- Friction reduces adoption + accuracy
- Many users abandon food logging despite wanting nutrition insights

**Solution**
- Infer nutrition impact from biometric anomalies after baseline period (90 days)
- No manual logging required; uses existing Oura sensor data
- Signal: unexplained deviations in sleep quality, HRV, resting HR, glucose (if Dexcom integrated)

**How It Works**
- **Phase 1 - Baseline**: Collect 90 days of clean biometric data
  - Establish personal baseline: sleep duration, sleep quality, HRV, resting HR, glucose variability
  - Control for known variables: menstrual cycle, exercise, stress events (user self-reports)
- **Phase 2 - Anomaly Detection**: Flag unexplained biometric changes
  - Sleep quality drops 20%+ without exercise explanation → likely nutrition-related
  - HRV drops significantly → possible meal timing/digestion issue
  - Glucose spike without exercise → carb-heavy meal inference
- **Phase 3 - Correlation**: ML model learns personal patterns
  - "When user eats late (inferred from bedtime + meal timing API), sleep latency increases by 15 min"
  - "High fiber meals correlate with +5% HRV next morning"
  - Personalized to individual metabolism (not population-average)

**Why Oura Should Build This**
- **Data moat**: Oura has millions of users' biometric + behavioral data; no competitor has this scale
- **UX breakthrough**: Removes friction of manual logging while increasing accuracy
- **Engagement**: Turns passive health tracking → active nutrition insights (without user effort)
- **Privacy-first**: No invasive photo analysis; uses data user already consents to
- **Complementary to Meals**: Oura Meals stays for explicit tracking; Inference Engine catches gaps

**Feasibility Assessment**
- **Easy**: Anomaly detection algorithms (standard ML)
- **Medium**: Controlling for confounding variables (menstrual cycle, exercise, stress)
- **Hard**: Building personalized models across diverse user metabolisms
- **Estimate**: 6-9 months for MVP (data science + validation on user cohorts)

**Interview Angle**
- Shows understanding of Oura's competitive advantages (data scale)
- Demonstrates ML/data thinking
- Identifies real UX friction points in existing products
- Proposes solution that leverages Oura's existing tech stack

---

## Idea 2: Menstrual Cycle–Aware Training (Oura × Strava Integration Enhancement)

**Problem**
- Oura tracks menstrual cycle; Strava tracks training
- Current Oura + Strava integration is basic (one-way activity mirroring)
- No feedback loop: "Your cycle phase + recovery metrics suggest you should adjust intensity"
- Female athletes have to manually manage cycle-training correlation

**Solution**
- Deeper Oura-Strava integration powered by Advisor AI
- Dynamically suggest training intensity based on cycle phase + biometric readiness
- Example: "Day 5 of cycle (luteal phase) + low HRV suggests easy run instead of tempo"

**How It Works**
- **Input 1**: Menstrual cycle phase (from Oura cycle tracking)
- **Input 2**: Readiness score (from Oura)
- **Input 3**: Training load (from Strava)
- **Output**: AI recommendation via Oura Advisor
  - "Your luteal phase + below-baseline HRV → suggest easy 30 min run instead of 10k tempo run"
  - "Follicular phase + elevated readiness → good day for speed work"

**Why Oura Should Build This**
- **Female health differentiation**: Oura already built proprietary women's health LLM (announced 2026)
- **Strava partnership expansion**: Deepens existing integration; creates switching costs
- **Market need**: Female runners are under-served by training apps (most ignore cycle)
- **Data validation**: Oura can publish research on cycle-performance correlation (thought leadership)

**Feasibility Assessment**
- **Easy**: Oura Advisor already integrates cycle data + Readiness
- **Medium**: Strava API for real-time training load pulling
- **Medium**: Validating cycle-phase training recommendations with sports science research
- **Estimate**: 3-4 months for MVP

**Interview Angle**
- Shows understanding of Oura's women's health momentum
- Identifies under-served market segment (female athletes)
- Recognizes partnership potential (Strava already integrated)
- Connects product features (cycle tracking + Readiness) to real use cases

---

## Idea 3: Injury-Aware Recovery Recommendations

**Problem**
- Oura gives readiness scores, but doesn't account for active injuries/constraints
- User with rib injury gets "high readiness → do speed work" without considering rib safety
- Manual workaround: Users ignore recommendations that conflict with injury management
- Reduces trust in AI coach

**Solution**
- Let users log injury constraints (duration, body part, HR/intensity limits)
- Oura Advisor incorporates constraints into recommendations
- Example: "High readiness BUT rib injury limits sustained HR >160 → do Zone 2 long run instead of VO2max intervals"

**How It Works**
- **User Input**: Injury log (body part, severity 1-5, HR limit, intensity limits)
- **Oura Integration**: Constraint-aware recommendation engine
  - Readiness score: 8/10 (normally suggests hard workout)
  - Injury constraint: Rib injury, max HR 160 bpm
  - Output: "Do 8 miles easy/moderate instead of 5K tempo"
- **Evolution Tracking**: Weekly injury status check-ins
  - "Rib improving → gradually increase intensity limit"
  - "Rib flaring → reduce intensity further"

**Why Oura Should Build This**
- **Safety**: Prevents recommendations that conflict with injury recovery
- **Accessibility**: Chronic pain/injury users feel supported (larger market than acknowledged)
- **Liability**: Clear documentation that Oura acknowledges injury constraints
- **Personalization**: Differentiates Advisor from generic AI coaches

**Feasibility Assessment**
- **Easy**: Constraint-based recommendation filtering (if-then logic or simple ML)
- **Medium**: Validating injury severity scales with sports medicine experts
- **Medium**: Evolution tracking (how injury severity changes with rehab)
- **Estimate**: 2-3 months for MVP

**Interview Angle**
- Shows empathy for real user constraints (not all users are healthy athletes)
- Demonstrates safety-first thinking (important for health tech)
- Practical problem-solving (identifies gap in current Advisor)

---

## Cross-Cutting Theme: Contextual AI Coaching

**Insight**
- Oura Advisor is powerful but assumes healthy, uninjured athletes
- Real users have:
  - Injuries / chronic pain
  - Menstrual cycles (for ~half the population)
  - Inconsistent availability (jobs, travel, life)
  - Dietary constraints / preferences
- Three ideas above are all variations of: **"Make Advisor smarter by adding context constraints"**

**Opportunity for Oura**
- AI coaching is crowded; contextual + constraint-aware coaching is differentiated
- Women's health LLM (launched 2026) is first step; these ideas expand it
- Data moat: Oura can validate these concepts on millions of users
- Interview framing: "I see Oura building toward contextual health coaching as their moat"

---

## Document Version

- **Created**: 2026-05-28
- **Status**: Research & ideas phase (not committed to building)
- **Context**: Developed while building Marathon Trainer personal app; ideas extracted as strategic thinking
