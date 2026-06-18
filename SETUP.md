# Setup Guide

Complete step-by-step guide to get the Running Coach app running locally.

## 1. Supabase Setup

### Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Fill in:
   - **Project name**: `marathon-trainer`
   - **Password**: Store this securely
   - **Region**: Choose closest to you
4. Wait for project to initialize (~2 minutes)

### Get Your Credentials

1. In the Supabase dashboard, click "Settings" (bottom left)
2. Go to "API" tab
3. Copy:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon public key** (starts with `eyJ...`)

### Run Database Migrations

1. In Supabase, go to "SQL Editor"
2. Click "New Query"
3. Copy the contents of `supabase/migrations/20260617_init_schema.sql`
4. Paste into the SQL editor
5. Click "Run"

You should see all tables created successfully.

### Verify Tables

1. Go to "Table Editor" in the left sidebar
2. You should see these tables:
   - `users`
   - `athlete_profile`
   - `workouts`
   - `run_details`
   - `strength_details`
   - `symptoms`
   - `recommendations`
   - `oura_daily_snapshot`

## 2. OpenAI Setup

1. Go to [platform.openai.com](https://platform.openai.com)
2. Sign in or create an account
3. Click your profile → "API keys"
4. Click "Create new secret key"
5. Copy the key immediately (it won't be shown again)

## 3. Environment Variables

1. In the project root, create `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```

2. Edit `.env.local` and fill in:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   OPENAI_API_KEY=sk-...
   ```

## 4. Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 5. Create Your First Account

1. Click "Create Account"
2. Use any email (for local testing: test@example.com)
3. Set a password
4. Confirm your email

## 6. Seed Your Profile

After signing in:

1. Go to **Settings** (⚙️)
2. Fill in your athlete profile:
   - **Age**: 25
   - **Training Goals**: "5K, then half-marathon"
   - **Current Run Level**:
     - Jog: 5 minutes 0 seconds
     - Walk: 2 minutes 0 seconds
     - Reps: 5–6
   - **Preferred Jog Speed**: 4.6 mph
   - **HR Back-off Threshold**: 170 bpm
   - **Training Days Per Week**: 5
3. Click "Save Changes"

## 7. Test the Workflow

1. Click "Log Workout" (📝) on the dashboard
2. Choose "Type Text" (voice not integrated yet)
3. Paste this test note:
   ```
   Did 5-minute jog, 2-minute walk x5 at 4.6 mph. 
   HR stayed in the 150s for the first three reps, 
   hit 170 briefly in the last rep. 
   Slept great, felt strong, no pain.
   ```
4. Click "Extract Data"
5. Review the extracted JSON
6. Click "Save Workout"

**Expected result**: Your dashboard should update with:
- Readiness score (probably 80+)
- Recommendation to progress to 6:00 jog / 2:00 walk intervals
- Risk level: Green

## 8. Troubleshooting

### "NEXT_PUBLIC_SUPABASE_URL is not defined"
- Make sure `.env.local` exists in the project root
- Check that the file has the correct variables
- Restart `npm run dev`

### "Error: No user found"
- You need to create an account first
- Go to /auth/login, click "Create Account"
- Log in with the new account

### "Extraction failed" (API error)
- Check that `OPENAI_API_KEY` is correct
- Verify you have OpenAI credits/quota
- Check the browser console for the actual error

### Database migration failed
- Make sure you're in a new Supabase project (not a shared one)
- Try running the migration in smaller chunks if it times out
- Check that all `CREATE TABLE` statements completed

## Next Steps

1. **Test the recommendation engine** with a few workouts
   - Log a great run → should suggest progression
   - Log a rough run → should suggest repeating or downgrading
   
2. **Integrate voice transcription** (Whisper API):
   - Update `app/log-workout/page.tsx` to call Whisper
   - Create `/app/api/transcribe/route.ts` endpoint

3. **Build workout history** with filtering and details

4. **Oura Ring integration** (Phase 2):
   - Implement OAuth flow for Oura
   - Set up daily data sync
   - Blend Oura readiness into score calculation

## Database Schema Notes

Key tables:

- **athletes_profile**: Stores user's current run level, preferences, Oura credentials
- **workouts**: Core log entry (date, type, summary, readiness)
- **run_details**: Interval details, HR data, speeds
- **symptoms**: Pain tracking (body area, severity, timing)
- **recommendations**: Next workout suggestion + rationale
- **oura_daily_snapshot**: Sleep, HRV, readiness (Phase 2)

All tables have Row Level Security (RLS) policies so users can only see their own data.

## Security Notes

- ✓ Database is behind RLS policies
- ✓ API keys are in `.env.local` (not in git)
- ✓ Supabase Auth handles user sessions
- ✓ OpenAI calls are server-side (API key not exposed)

## Questions?

Check:
- `PRD.md` for product requirements
- `DATA_MODEL_WITH_OURA.md` for schema details
- Supabase docs: https://supabase.com/docs
- OpenAI docs: https://platform.openai.com/docs
