import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    // Get current user from session (no user ID needed!)
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userId = user.id;

    const today = new Date().toISOString().split('T')[0];

    // Create a test completed workout with no notes
    const { data: workout, error } = await supabaseAdmin
      .from('workouts')
      .insert([
        {
          user_id: userId,
          workout_date: today,
          workout_type: 'run',
          summary: 'Test run from Oura',
          completed: true,
          raw_note: null,
          transcript: null,
          perceived_effort: null,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      workout,
    });
  } catch (error) {
    console.error('Test workout error:', error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
