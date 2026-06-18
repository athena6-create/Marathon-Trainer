-- Running Coach App - Initial Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Athlete profile table
CREATE TABLE IF NOT EXISTS athlete_profile (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  age INTEGER,
  goals TEXT,
  current_run_level_jog_minutes INTEGER,
  current_run_level_jog_seconds INTEGER,
  current_run_level_walk_minutes INTEGER,
  current_run_level_walk_seconds INTEGER,
  current_run_level_reps_min INTEGER,
  current_run_level_reps_max INTEGER,
  preferred_jog_speed_mph FLOAT,
  preferred_walk_speed_mph FLOAT,
  hr_backoff_threshold INTEGER DEFAULT 170,
  notes TEXT,
  oura_access_token TEXT, -- encrypted in production
  oura_refresh_token TEXT, -- encrypted in production
  oura_user_id TEXT,
  oura_synced_at TIMESTAMP,
  training_days_per_week INTEGER,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Workouts table
CREATE TABLE IF NOT EXISTS workouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workout_date DATE NOT NULL,
  workout_type TEXT CHECK (workout_type IN ('run', 'strength', 'mobility', 'walk_hike', 'rest', 'other')),
  raw_note TEXT,
  transcript TEXT,
  summary TEXT,
  completed BOOLEAN DEFAULT true,
  duration_minutes INTEGER,
  distance_miles FLOAT,
  perceived_effort INTEGER,
  readiness_before INTEGER,
  readiness_after INTEGER,
  oura_sleep_duration INTEGER,
  oura_sleep_score INTEGER,
  oura_readiness_score INTEGER,
  oura_resting_hr INTEGER,
  oura_hrv FLOAT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_workouts_user_date ON workouts(user_id, workout_date);

-- Run details table
CREATE TABLE IF NOT EXISTS run_details (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workout_id UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  jog_minutes INTEGER,
  jog_seconds INTEGER,
  walk_minutes INTEGER,
  walk_seconds INTEGER,
  reps_planned INTEGER,
  reps_completed INTEGER,
  jog_speed_mph FLOAT,
  walk_speed_mph FLOAT,
  max_hr INTEGER,
  avg_hr INTEGER,
  hr_notes TEXT,
  hr_recovered_to INTEGER,
  hit_threshold BOOLEAN,
  threshold_timing TEXT,
  modified BOOLEAN,
  modification_notes TEXT,
  created_at TIMESTAMP DEFAULT now()
);

-- Strength details table
CREATE TABLE IF NOT EXISTS strength_details (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workout_id UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  focus_area TEXT CHECK (focus_area IN ('upper', 'lower', 'mobility', 'knee_support', 'core')),
  exercises_json JSONB,
  soreness_after INTEGER,
  bracing_pain BOOLEAN,
  created_at TIMESTAMP DEFAULT now()
);

-- Symptoms table
CREATE TABLE IF NOT EXISTS symptoms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workout_id UUID REFERENCES workouts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body_area TEXT CHECK (body_area IN ('knee', 'hip', 'shin', 'calf', 'foot', 'rib', 'other')),
  severity INTEGER CHECK (severity >= 0 AND severity <= 5),
  timing TEXT,
  description TEXT,
  affected_form BOOLEAN,
  next_day_pain BOOLEAN,
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_symptoms_workout ON symptoms(workout_id);
CREATE INDEX idx_symptoms_user ON symptoms(user_id);

-- Recommendations table
CREATE TABLE IF NOT EXISTS recommendations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  triggered_by_workout_id UUID REFERENCES workouts(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT now(),
  recommended_date DATE NOT NULL,
  workout_type TEXT CHECK (workout_type IN ('run', 'strength', 'mobility', 'walk_hike', 'rest', 'other')),
  run_prescription JSONB,
  strength_prescription JSONB,
  rationale TEXT,
  readiness_score INTEGER,
  risk_level TEXT CHECK (risk_level IN ('green', 'yellow', 'red')),
  user_acknowledged BOOLEAN DEFAULT false,
  user_overridden BOOLEAN DEFAULT false,
  override_notes TEXT,
  status TEXT CHECK (status IN ('pending', 'completed', 'skipped', 'overridden')) DEFAULT 'pending'
);

CREATE INDEX idx_recommendations_user_date ON recommendations(user_id, recommended_date);

-- Oura daily snapshot table (Phase 2)
CREATE TABLE IF NOT EXISTS oura_daily_snapshot (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  sleep_duration INTEGER,
  sleep_score INTEGER,
  sleep_deep INTEGER,
  sleep_light INTEGER,
  sleep_rem INTEGER,
  sleep_latency INTEGER,
  readiness_score INTEGER,
  readiness_contributors JSONB,
  resting_heart_rate INTEGER,
  hrv FLOAT,
  body_temperature_deviation FLOAT,
  activity_score INTEGER,
  active_calories INTEGER,
  steps INTEGER,
  synced_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_oura_snapshot_user_date ON oura_daily_snapshot(user_id, snapshot_date);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE athlete_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE run_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE strength_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE symptoms ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE oura_daily_snapshot ENABLE ROW LEVEL SECURITY;

-- RLS Policies (users can only see their own data)
CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  USING (auth.uid()::text = id::text);

CREATE POLICY "Users can view their own athlete_profile"
  ON athlete_profile FOR SELECT
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their own athlete_profile"
  ON athlete_profile FOR UPDATE
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert their own athlete_profile"
  ON athlete_profile FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can view their own workouts"
  ON workouts FOR SELECT
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert their own workouts"
  ON workouts FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their own workouts"
  ON workouts FOR UPDATE
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can view their own run_details"
  ON run_details FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM workouts
    WHERE workouts.id = run_details.workout_id
    AND workouts.user_id::text = auth.uid()::text
  ));

CREATE POLICY "Users can insert their own run_details"
  ON run_details FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM workouts
    WHERE workouts.id = workout_id
    AND workouts.user_id::text = auth.uid()::text
  ));

CREATE POLICY "Users can view their own strength_details"
  ON strength_details FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM workouts
    WHERE workouts.id = strength_details.workout_id
    AND workouts.user_id::text = auth.uid()::text
  ));

CREATE POLICY "Users can insert their own strength_details"
  ON strength_details FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM workouts
    WHERE workouts.id = workout_id
    AND workouts.user_id::text = auth.uid()::text
  ));

CREATE POLICY "Users can view their own symptoms"
  ON symptoms FOR SELECT
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert their own symptoms"
  ON symptoms FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can view their own recommendations"
  ON recommendations FOR SELECT
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can view their own oura_snapshots"
  ON oura_daily_snapshot FOR SELECT
  USING (auth.uid()::text = user_id::text);
