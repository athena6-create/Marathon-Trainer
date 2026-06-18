# Running Coach — Personalized Training App

A mobile-first web app that helps runners train smarter through voice-based workout logging, AI-powered data extraction, and rule-based coaching recommendations.

## Features

- **Voice Workout Logging**: Record voice notes after workouts; app transcribes and extracts structured data
- **AI Data Extraction**: OpenAI processes notes to extract intervals, HR data, recovery signals, pain, etc.
- **Smart Readiness Scoring**: Rule-based algorithm (not ML) calculates 0-100 readiness based on sleep, soreness, pain, recent workouts
- **Personalized Recommendations**: Suggests next workout with rationale (e.g., "repeat current level because HR was controlled")
- **Injury Tracking**: Monitor pain (severity 0-5) by body area; app flags and recommends downgrades
- **Progressive Run/Walk Intervals**: Tracks current run level, suggests safe progressions
- **Strength Training Integration**: Recommends upper/lower/mobility/knee-support work; tracks soreness impact on runs
- **Dashboard**: View today's recommendation, readiness status, current run level, recent warnings

## Tech Stack

- **Frontend**: Next.js (TypeScript) + React + Tailwind CSS
- **Backend**: Next.js API routes (serverless)
- **Database**: Supabase (PostgreSQL) with Row Level Security
- **Auth**: Supabase Auth
- **AI**: OpenAI Whisper (transcription) + Claude (data extraction)
- **Hosting**: Vercel (frontend) + Supabase (database)

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account (free tier)
- OpenAI API key

### Setup

1. **Clone the repo**
   ```bash
   git clone https://github.com/athena6-create/Marathon-Trainer.git
   cd Marathon-Trainer
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create Supabase project**
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Copy your project URL and API keys

4. **Run database migrations**
   ```bash
   # TODO: Add Supabase CLI migration steps
   ```

5. **Set up environment variables**
   ```bash
   cp .env.local.example .env.local
   ```
   
   Edit `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   OPENAI_API_KEY=your_openai_key
   ```

6. **Run development server**
   ```bash
   npm run dev
   ```
   
   Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
app/
  ├── layout.tsx              # Root layout
  ├── page.tsx                # Dashboard (main page)
  ├── auth/
  │   └── login/page.tsx      # Login/signup page
  ├── log-workout/page.tsx    # Workout logging interface
  ├── history/page.tsx        # Workout history
  ├── profile/page.tsx        # Settings
  ├── api/
  │   ├── extract-workout/    # OpenAI extraction endpoint
  │   └── calculate-readiness/ # Readiness score calculation
  └── globals.css

lib/
  ├── supabase.ts             # Supabase client
  ├── types.ts                # TypeScript definitions

supabase/
  └── migrations/
      └── 20260617_init_schema.sql # Database schema

DATA_MODEL_WITH_OURA.md      # Full schema documentation
PRD.md                        # Product requirements document
```

## Key Concepts

### Readiness Score (0-100)

Calculated from:
- Sleep quality: Good sleep +10, poor -20
- Soreness: 1-5 scale, up to -15
- Pain: 0-2 discomfort -5, 3+ significant -20
- Last run difficulty: Hard run < 48h ago -10
- Lower body strength: < 24h with soreness -15
- Alcohol/hangover: -15
- Period symptoms: Heavy -10
- Subjective energy: Low -10

**Risk Levels**:
- 80-100: 🟢 Green — progress allowed
- 60-79: 🟡 Normal — repeat current
- 40-59: 🟡 Yellow — downgrade
- 0-39: 🔴 Red — rest/walk only

### Run/Walk Intervals

Represented as: `{jog_min, jog_sec, walk_min, walk_sec, reps_min, reps_max, speed_mph}`

Example: `5:00 jog / 2:00 walk x5-6 @ 4.6 mph`

Progression rules:
- Repeat pattern 2+ times before advancing
- Increase duration before speed
- Step down if HR spikes, pain appears, or readiness is low

### Recommendation Engine

**Progressive** (advance when all true):
- Last workout completed
- HR controlled (didn't spike early)
- No pain
- Readiness ≥ 70
- Pattern repeated 2+ times

**Conservative** (downgrade when any true):
- Poor sleep
- High soreness
- Pain present
- HR hit threshold too early
- Last workout was hard

## Current Status

**MVP Complete ✓**:
- [x] Database schema with RLS
- [x] Authentication flow
- [x] Dashboard with readiness display
- [x] Workout logging (voice + text)
- [x] OpenAI extraction endpoint
- [x] Readiness calculation
- [x] Recommendation engine (basic)

**Coming Soon**:
- [ ] Whisper API integration for voice transcription
- [ ] Workout history with filters
- [ ] Advanced recommendation logic with progressions
- [ ] Oura Ring integration (Phase 2)
- [ ] Strava integration (Phase 2)

## Development

### Run tests
```bash
npm run test
```

### Build for production
```bash
npm run build
npm start
```

### Lint
```bash
npm run lint
```

## Contributing

This is a personal project, but the PRD and architecture are designed to be extensible.

Key areas for future work:
- Voice transcription integration (Whisper)
- Recommendation logic refinements (test with real workouts)
- Oura API authentication and data sync
- Strava API integration
- Performance analytics dashboard

## Safety

**This app is not a doctor.** It provides coaching suggestions based on rules, not medical advice.

- If you experience chest pain, fainting, or severe pain, stop and seek medical care
- Always consult a doctor for persistent injury
- The app flags concerns but doesn't diagnose

See the full disclaimer in the app's settings.

## License

Personal project. Not licensed for public use.

## Contact

Questions? Reach out at tripath6@wharton.upenn.edu
