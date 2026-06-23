import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      note,
      jog_minutes,
      jog_seconds,
      walk_minutes,
      walk_seconds,
      reps_min,
      reps_max,
      speed_mph,
    } = body;

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    // Create a pending workout (not yet logged, just scheduled)
    const today = new Date().toISOString().split('T')[0];
    const { data: workout, error: workoutError } = await supabaseAdmin
      .from('workouts')
      .insert([
        {
          user_id: userId,
          workout_date: today,
          workout_type: 'run',
          raw_note: note,
          summary: 'Pending - details to be logged after workout',
          completed: false,
          perceived_effort: null,
        },
      ])
      .select()
      .single();

    if (workoutError) throw workoutError;

    // Save run details
    const { error: runError } = await supabaseAdmin
      .from('run_details')
      .insert([
        {
          workout_id: workout.id,
          jog_minutes,
          jog_seconds,
          walk_minutes,
          walk_seconds,
          reps_planned: reps_min,
          jog_speed_mph: speed_mph,
        },
      ]);

    if (runError) throw runError;

    return NextResponse.json({
      success: true,
      workout: workout,
    });
  } catch (error) {
    console.error('Save pending workout error:', error);
    const errorMsg = error instanceof Error ? error.message : 'Save failed';
    return NextResponse.json(
      { error: errorMsg },
      { status: 500 }
    );
  }
}
