import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import type { WorkoutExtraction, Workout } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    console.log('Save workout request received');
    const body = await request.json();
    const { extracted, rawNote, userId } = body as { extracted: WorkoutExtraction; rawNote: string; userId: string };

    console.log('Body parsed:', { userId, workoutType: extracted.workout_type });

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Save workout
    const workoutData: Partial<Workout> = {
      user_id: userId,
      workout_date: new Date().toISOString().split('T')[0],
      workout_type: extracted.workout_type,
      raw_note: rawNote,
      transcript: rawNote,
      summary: extracted.summary,
      completed: extracted.completed,
      duration_minutes: extracted.run?.reps_planned ?
        ((extracted.run.jog_minutes || 0) + (extracted.run.walk_minutes || 0)) * extracted.run.reps_planned :
        undefined,
      perceived_effort: 5,
    };

    const { data: savedWorkout, error: workoutError } = await supabase
      .from('workouts')
      .insert([workoutData])
      .select()
      .single();

    if (workoutError) throw workoutError;

    // Save run details if it's a run
    if (extracted.run && savedWorkout) {
      const { error: runError } = await supabase
        .from('run_details')
        .insert([{
          workout_id: savedWorkout.id,
          jog_minutes: extracted.run.jog_minutes,
          jog_seconds: extracted.run.jog_seconds,
          walk_minutes: extracted.run.walk_minutes,
          walk_seconds: extracted.run.walk_seconds,
          reps_planned: extracted.run.reps_planned,
          reps_completed: extracted.run.reps_completed,
          jog_speed_mph: extracted.run.jog_speed_mph,
          walk_speed_mph: extracted.run.walk_speed_mph,
          max_hr: extracted.run.max_hr,
          avg_hr: extracted.run.avg_hr,
          hr_notes: extracted.run.hr_recovery,
          hit_threshold: extracted.run.hit_170,
          threshold_timing: extracted.run.threshold_timing,
          modified: !!extracted.run.modifications,
          modification_notes: extracted.run.modifications,
        }]);

      if (runError) throw runError;
    }

    // Save symptoms if any
    if (extracted.symptoms && savedWorkout) {
      const symptomData = extracted.symptoms.map(s => ({
        workout_id: savedWorkout.id,
        user_id: userId,
        body_area: s.body_area,
        severity: s.severity,
        description: s.description,
        affected_form: s.affected_form,
        timing: s.timing,
      }));

      const { error: symptomError } = await supabase
        .from('symptoms')
        .insert(symptomData);

      if (symptomError) throw symptomError;
    }

    // Calculate readiness
    let manualReadiness = 100;
    let riskLevel: 'green' | 'yellow' | 'red' = 'green';

    if (extracted.symptoms && extracted.symptoms.length > 0) {
      extracted.symptoms.forEach(s => {
        if (s.severity && s.severity >= 3) {
          manualReadiness -= 20;
        } else if (s.severity && s.severity > 0) {
          manualReadiness -= 5;
        }
      });
    }

    if (extracted.run?.hit_170 && extracted.run.threshold_timing === 'early') {
      manualReadiness -= 15;
    }

    manualReadiness = Math.max(0, Math.min(100, manualReadiness));

    // Get today's Oura readiness and blend with manual readiness
    let readinessScore = manualReadiness;
    let ouraReadiness: number | null = null;
    let blendBreakdown = '';

    const today = new Date().toISOString().split('T')[0];
    const { data: ouraSnapshot } = await supabaseAdmin
      .from('oura_daily_snapshot')
      .select('readiness_score')
      .eq('user_id', userId)
      .eq('snapshot_date', today)
      .single();

    if (ouraSnapshot?.readiness_score) {
      ouraReadiness = ouraSnapshot.readiness_score;
      // Blend: 60% manual + 40% Oura
      readinessScore = Math.round(manualReadiness * 0.6 + ouraReadiness * 0.4);
      blendBreakdown = ` (Your inputs: ${manualReadiness} | Oura: ${ouraReadiness} | Blended: ${readinessScore})`;
    }

    if (readinessScore >= 80) {
      riskLevel = 'green';
    } else if (readinessScore >= 40) {
      riskLevel = 'yellow';
    } else {
      riskLevel = 'red';
    }

    let recommendationText = 'Great session! ';
    let prescriptionIntensity = 'easy';

    if (extracted.run?.hit_170 && extracted.run.threshold_timing === 'early') {
      recommendationText = 'Your HR spiked early. ';
      prescriptionIntensity = 'easy';
    } else if (riskLevel === 'green') {
      recommendationText = 'Solid effort with good control. ';
      if (ouraReadiness !== null && ouraReadiness >= 80) {
        recommendationText += `Your Oura readiness is ${ouraReadiness}, so you're well-recovered. `;
      }
      prescriptionIntensity = 'progress';
    } else if (riskLevel === 'yellow') {
      recommendationText = 'Good effort. ';
      if (ouraReadiness !== null && ouraReadiness < 70) {
        recommendationText += `Your Oura readiness is ${ouraReadiness}, so take it easier next time. `;
      } else {
        recommendationText += 'Consider taking it easy next time. ';
      }
      prescriptionIntensity = 'repeat';
    }

    recommendationText += blendBreakdown;

    const { error: recError } = await supabase
      .from('recommendations')
      .insert([{
        user_id: userId,
        triggered_by_workout_id: savedWorkout.id,
        recommended_date: today,
        workout_type: 'run',
        run_prescription: {
          jog_minutes: extracted.run?.jog_minutes || 5,
          jog_seconds: extracted.run?.jog_seconds || 0,
          walk_minutes: extracted.run?.walk_minutes || 2,
          walk_seconds: extracted.run?.walk_seconds || 0,
          reps_min: extracted.run?.reps_planned || 5,
          reps_max: (extracted.run?.reps_planned || 5) + 1,
          speed_mph: extracted.run?.jog_speed_mph || 4.6,
          intensity: prescriptionIntensity,
          notes: recommendationText,
        },
        rationale: recommendationText,
        readiness_score: readinessScore,
        risk_level: riskLevel,
      }]);

    if (recError) throw recError;

    return NextResponse.json({ success: true, workout: savedWorkout });
  } catch (error) {
    console.error('Save workout error:', error);
    const errorMsg = error instanceof Error ? error.message : 'Save failed';
    console.error('Error details:', errorMsg);
    console.error('Full error:', JSON.stringify(error));
    return NextResponse.json(
      { error: errorMsg },
      { status: 500 }
    );
  }
}
