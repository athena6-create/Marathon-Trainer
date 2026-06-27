import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { Anthropic } from '@anthropic-ai/sdk';

const client = new Anthropic();

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    console.log(`\n=== ANALYZING PATTERNS FOR USER ${userId} ===`);

    // Fetch all training sessions with associated Oura data
    const { data: trainingSessions, error: sessionsError } = await supabaseAdmin
      .from('training_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('session_date', { ascending: false })
      .limit(50);

    if (sessionsError) throw sessionsError;

    if (!trainingSessions || trainingSessions.length < 3) {
      return NextResponse.json({
        success: true,
        patterns: null,
        message: 'Not enough data yet (need 3+ workouts)',
      });
    }

    // For each session, fetch the Oura data from that day
    const sessionsWithOura = await Promise.all(
      trainingSessions.map(async (session) => {
        const { data: ouraData } = await supabaseAdmin
          .from('oura_daily_snapshot')
          .select('*')
          .eq('user_id', userId)
          .eq('snapshot_date', session.session_date)
          .single();

        return {
          session,
          oura: ouraData,
        };
      })
    );

    const analysisPrompt = `You are analyzing a runner's training patterns to identify correlations between their Oura Ring recovery metrics and training performance.

TRAINING DATA (${trainingSessions.length} workouts):
${JSON.stringify(sessionsWithOura.slice(0, 20), null, 2)}

Analyze and identify patterns:

1. SLEEP CORRELATION: Does sleep quality/duration affect workout completion and performance?
   - When sleep_score >= 75: What happens to workout success?
   - When sleep_score < 60: Any patterns?
   - Does deep sleep matter more than total duration?

2. READINESS CORRELATION: How does readiness_score predict progression success?
   - When readiness >= 75: Can they progress?
   - When readiness < 50: Should they rest?
   - What readiness score correlates with best performance?

3. HRV & RECOVERY: What does HRV tell us about this runner's recovery?
   - Is HRV a good predictor of workout quality?
   - Does resting_heart_rate help identify overtraining?

4. ACTIVITY & FATIGUE: How does activity_score before a workout affect it?
   - Does high previous activity = need recovery?
   - Low activity = ready for hard effort?

5. PERSONAL THRESHOLDS: What are THIS RUNNER'S unique metrics?
   - Their personal "green zone" (highest performance range)
   - Their personal "rest zone" (too fatigued)
   - Their personal "caution zone" (proceed carefully)

Return ONLY valid JSON (no markdown):
{
  "data_points": 5,
  "sleep_insights": "Key findings about sleep impact on performance",
  "readiness_insights": "Readiness score patterns and thresholds",
  "hrv_insights": "HRV and RHR patterns",
  "activity_insights": "Activity level and recovery patterns",
  "personal_thresholds": {
    "green_zone_readiness": "75+",
    "caution_zone_readiness": "50-75",
    "rest_zone_readiness": "<50",
    "optimal_sleep_score": "XX",
    "optimal_sleep_duration_hours": XX,
    "dangerous_signals": ["list of red flags observed"]
  },
  "progression_success_rate": "X% when readiness >= Y and sleep >= Z",
  "rest_day_indicators": "When to definitely take a rest day based on this runner's data",
  "key_pattern": "The most important single insight about this runner's unique pattern"
}`;

    const response = await client.messages.create({
      model: 'claude-opus-4-1',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: analysisPrompt,
        },
      ],
    });

    const responseText =
      response.content[0].type === 'text' ? response.content[0].text : '';

    const patterns = JSON.parse(responseText);

    console.log('✅ Patterns analyzed:', JSON.stringify(patterns, null, 2));

    // Store the analysis (optional - could also just return)
    await supabaseAdmin
      .from('training_state')
      .update({
        pattern_analysis: patterns,
        pattern_analysis_updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    return NextResponse.json({
      success: true,
      patterns,
      workout_count: trainingSessions.length,
    });
  } catch (error) {
    console.error('Pattern analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze patterns', details: String(error) },
      { status: 500 }
    );
  }
}
