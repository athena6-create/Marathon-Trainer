import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { Anthropic } from '@anthropic-ai/sdk';
import { WebSearch } from '@anthropic-ai/sdk/resources';

const client = new Anthropic();

export async function POST(request: NextRequest) {
  console.log('📝 [submit-session] Received request');
  try {
    console.log('📝 [submit-session] Parsing JSON...');
    const {
      userId,
      structured_data,
      questionnaire_answers,
      oura_snapshot,
      run_level,
    } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    console.log(`\n✅ [submit-session] TRAINING SESSION START (User: ${userId})`);

    // Get recent training history for context
    const { data: recentSessions } = await supabaseAdmin
      .from('training_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('session_date', { ascending: false })
      .limit(7);

    // Merge all data
    const allData = {
      ...structured_data,
      ...questionnaire_answers,
    };

    console.log('Merged workout data:', JSON.stringify(allData, null, 2));
    console.log('Oura snapshot:', JSON.stringify(oura_snapshot, null, 2));

    // Determine if we need live research
    const needsResearch = determineLiveResearchNeeds(allData, run_level);

    let researchedWorkout = null;
    if (needsResearch) {
      console.log(`Live research needed: ${needsResearch}`);
      researchedWorkout = await performLiveResearch(allData, run_level, needsResearch);
    }

    // Fetch existing pattern analysis for this user (if available)
    let patterns = null;
    try {
      const { data: trainingState } = await supabaseAdmin
        .from('training_state')
        .select('pattern_analysis')
        .eq('user_id', userId)
        .single();
      patterns = trainingState?.pattern_analysis;
    } catch (err) {
      console.log('Pattern analysis not yet available');
    }

    const patternContext = patterns
      ? `
PERSONALIZED PATTERNS (from ${patterns.data_points || 'recent'} workouts):
${JSON.stringify(patterns, null, 2)}

Use these personal thresholds to inform your recommendation.`
      : 'Pattern analysis will be available after 3+ workouts.';

    // Generate recommendation
    const recommendationPrompt = `You are a conservative, beginner-safe half-marathon training assistant.

Current training state:
- Run level: ${run_level}
- Recent sessions: ${recentSessions?.length || 0} in last 7 days

Today's workout:
${JSON.stringify(allData, null, 2)}

Oura Ring recovery data (IMPORTANT - use this to inform recommendations):
- Sleep score: ${oura_snapshot?.sleep_score} (0-100, higher is better)
- Sleep duration: ${oura_snapshot?.sleep_duration} minutes
- Readiness/Resilience: ${oura_snapshot?.resilience_score} (0-100, higher is better)
- Activity level: ${oura_snapshot?.activity_score} (0-100)
- HRV: ${oura_snapshot?.hrv} (higher is better for recovery)
- Resting heart rate: ${oura_snapshot?.resting_heart_rate} bpm (lower is better)

${patternContext}

${researchedWorkout ? `Researched workout option:\n${JSON.stringify(researchedWorkout, null, 2)}` : ''}

Generate a conservative, safety-first recommendation. Return ONLY valid JSON (no markdown):

{
  "summary": "1-2 sentence summary of the workout",
  "readiness": "Brief 1-2 sentence assessment based on Oura data",
  "risk": "Assessment of pain/fatigue/warning signs",
  "next_action": "ONE primary recommendation: Rest day|Easy walk|Mobility|Knee strength|Hip/glute strength|Calf strength|Upper-body strength|Core|Repeat same level|Progress to next|Reduce intensity|Take 48h off|Seek professional",
  "reasoning": "2-3 sentences explaining the recommendation",
  "watch_outs": "Warning signs to watch (or null if none)",
  "workout": null or {
    "name": "Workout name",
    "category": "knee-strength|hip-glute|calf-ankle|core|upper-body|mobility|recovery",
    "exercises": [
      {"name": "Exercise", "sets": 2, "reps": "10-12"}
    ]
  },
  "next_run": "Recommendation for next run (repeat, progress, or deload)",
  "progression_note": "Guidance on run level progression"
}

Decision rules - COMBINE workout performance WITH Oura data:
- Oura readiness <50 + any fatigue = REST day, no progression
- Oura readiness 50-75 = conservative, repeat level or easy workout
- Oura readiness ≥75 + completed + low effort = may progress
- Poor sleep (<60 score) = prioritize recovery over progression
- High HRV + good sleep + ready feeling = ready for harder effort
- Perceived effort 8-10 = repeat same level, don't progress
- Completed workout + low fatigue + high readiness = progress ready
- Workout feeling < completion = repeat level, assess recovery

Use Oura as ground truth for recovery state. Be conservative. When in doubt, repeat the level or suggest recovery.`;

    console.log('Calling Claude API for recommendation...');
    const response = await client.messages.create({
      model: 'claude-opus-4-1',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: recommendationPrompt,
        },
      ],
    });

    const responseText =
      response.content[0].type === 'text' ? response.content[0].text : '';
    console.log('Claude response received, parsing...');

    const recommendation = JSON.parse(responseText);
    console.log('✅ Generated recommendation:', recommendation);

    // Save the session
    const { data: session, error: insertError } = await supabaseAdmin
      .from('training_sessions')
      .insert({
        user_id: userId,
        session_date: new Date().toISOString().split('T')[0],
        workout_type: structured_data.workout_type || 'run',
        completed: structured_data.completed,
        duration_minutes: structured_data.duration_minutes,
        distance_miles: structured_data.distance_miles,
        avg_heart_rate: structured_data.avg_heart_rate,
        max_heart_rate: structured_data.max_heart_rate,
        perceived_effort: structured_data.perceived_effort,
        knee_pain: structured_data.knee_pain,
        general_soreness: structured_data.general_soreness,
        fatigue: structured_data.fatigue,
        breathing_difficulty: structured_data.breathing_difficulty,
        mood: structured_data.mood,
        raw_note: structured_data.raw_note,
        structured_data: structured_data,
        questionnaire_answers: questionnaire_answers,
        oura_snapshot: oura_snapshot,
        recommendation: recommendation.recommendation,
        next_action: recommendation.next_action,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      throw insertError;
    }

    console.log('✅ Session saved:', session?.id);

    // Update run level if progressing
    if (recommendation.next_action === 'Progress to next run level') {
      const newLevel = Math.min(run_level + 1, 13);
      const { error: updateError } = await supabaseAdmin
        .from('training_state')
        .update({ current_run_level: newLevel })
        .eq('user_id', userId);

      if (updateError) console.error('Level update error:', updateError);
    }

    // Update progress percentage (simple formula)
    const completionBonus = structured_data.completed ? 5 : 0;
    const { error: progressError } = await supabaseAdmin
      .from('training_state')
      .update({
        half_marathon_progress: Math.min(
          40 * (run_level / 13) + 30 + 20 + completionBonus,
          100
        ),
      })
      .eq('user_id', userId);

    if (progressError) console.error('Progress update error:', progressError);

    console.log(`=== TRAINING SESSION END ===\n`);

    return NextResponse.json({
      success: true,
      session_id: session?.id,
      ...recommendation,
    });
  } catch (error) {
    console.error('Submit session error:', error);
    const errorMsg = error instanceof Error ? error.message : JSON.stringify(error);
    console.error('Error details:', errorMsg);
    return NextResponse.json(
      { error: 'Failed to generate recommendation', details: errorMsg },
      { status: 500 }
    );
  }
}

function determineLiveResearchNeeds(data: any, runLevel: number): string | null {
  if (data.knee_pain > 2) {
    return 'knee-strength';
  }
  if (data.fatigue > 7) {
    return 'recovery';
  }
  if (data.perceived_effort <= 5 && data.completed) {
    return 'progression-readiness';
  }
  return null;
}

async function performLiveResearch(
  data: any,
  runLevel: number,
  researchType: string
): Promise<any> {
  console.log(`Performing live research: ${researchType}`);

  const searchQuery =
    researchType === 'knee-strength'
      ? 'beginner runner knee strengthening exercises glute calf hip'
      : researchType === 'recovery'
        ? 'recovery workout for beginner runners mobility stretching'
        : 'beginner half marathon progression run walk intervals';

  try {
    // Note: WebSearch is a model_type, not a direct API call
    // For now, we'll use Claude's knowledge. In production, use a web search API.
    const response = await client.messages.create({
      model: 'claude-opus-4-1',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `Research and recommend a beginner-safe workout for: ${searchQuery}

Return ONLY valid JSON (no markdown):
{
  "name": "Workout name",
  "category": "knee-strength|hip-glute|calf-ankle|core|upper-body|mobility|recovery",
  "description": "Why this workout",
  "exercises": [
    {"name": "Exercise name", "sets": 2, "reps": "8-10", "notes": "form tips"}
  ],
  "frequency": "How often",
  "beginner_friendly": true,
  "sources": ["reputable sources used"]
}`,
        },
      ],
    });

    const responseText =
      response.content[0].type === 'text' ? response.content[0].text : '';
    const workout = JSON.parse(responseText);

    console.log('✅ Researched workout:', workout.name);

    return workout;
  } catch (error) {
    console.error('Research error:', error);
    return null;
  }
}
