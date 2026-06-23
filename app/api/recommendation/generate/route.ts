import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Hardcoded progression levels
const PROGRESSION_LEVELS = [
  {
    id: 1,
    name: "Level 1",
    jog_minutes: 5,
    jog_seconds: 0,
    walk_minutes: 2,
    walk_seconds: 0,
    reps_min: 5,
    reps_max: 6,
    speed_mph: 4.6,
  },
  {
    id: 2,
    name: "Level 2",
    jog_minutes: 6,
    jog_seconds: 0,
    walk_minutes: 2,
    walk_seconds: 0,
    reps_min: 4,
    reps_max: 5,
    speed_mph: 4.5,
  },
  {
    id: 3,
    name: "Level 3",
    jog_minutes: 8,
    jog_seconds: 0,
    walk_minutes: 2,
    walk_seconds: 0,
    reps_min: 3,
    reps_max: 4,
    speed_mph: 4.4,
  },
  {
    id: 4,
    name: "Level 4",
    jog_minutes: 10,
    jog_seconds: 0,
    walk_minutes: 2,
    walk_seconds: 0,
    reps_min: 2,
    reps_max: 3,
    speed_mph: 4.3,
  },
];

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    // Get Oura readiness for today
    const today = new Date().toISOString().split("T")[0];
    const { data: ouraData } = await supabaseAdmin
      .from("oura_daily_snapshot")
      .select("readiness_score")
      .eq("user_id", userId)
      .eq("snapshot_date", today)
      .single();

    const ouraReadiness = ouraData?.readiness_score || 75; // Default to 75 if no Oura data

    // Get user's current progression level (from athlete_profile or default to 1)
    const { data: profile } = await supabaseAdmin
      .from("athlete_profile")
      .select("current_run_level_jog_minutes")
      .eq("user_id", userId)
      .single();

    let currentLevelId = 1;
    if (profile?.current_run_level_jog_minutes === 6) currentLevelId = 2;
    else if (profile?.current_run_level_jog_minutes === 8) currentLevelId = 3;
    else if (profile?.current_run_level_jog_minutes === 10) currentLevelId = 4;

    // Get last 3 workouts to see if they're consistently completing
    const { data: recentWorkouts } = await supabaseAdmin
      .from("workouts")
      .select("*")
      .eq("user_id", userId)
      .eq("workout_type", "run")
      .order("workout_date", { ascending: false })
      .limit(3);

    // Simple progression logic
    let recommendedLevelId = currentLevelId;
    let rationale = "";

    if (recentWorkouts && recentWorkouts.length >= 2) {
      const lastWorkout = recentWorkouts[0];
      const completedAtLevel = recentWorkouts.slice(0, 3).every(w =>
        w.completed && !w.raw_note?.toLowerCase().includes("struggle")
      );

      if (completedAtLevel && ouraReadiness >= 70 && currentLevelId < 4) {
        // Ready to progress
        recommendedLevelId = currentLevelId + 1;
        rationale = `You've crushed the last ${recentWorkouts.length} runs and your Oura readiness is ${ouraReadiness}. Time to level up!`;
      } else if (ouraReadiness < 50) {
        // Need to recover
        recommendedLevelId = Math.max(1, currentLevelId - 1);
        rationale = `Your Oura readiness is ${ouraReadiness}. Let's dial it back and focus on recovery.`;
      } else {
        // Stay at current
        rationale = `Keep grinding this level. Oura readiness: ${ouraReadiness}. You're building a solid foundation.`;
      }
    } else {
      rationale = `Start with this level. Oura readiness today: ${ouraReadiness}.`;
    }

    const recommendedLevel = PROGRESSION_LEVELS.find(
      (l) => l.id === recommendedLevelId
    );

    return NextResponse.json({
      recommended_level_id: recommendedLevelId,
      run_prescription: {
        jog_minutes: recommendedLevel?.jog_minutes,
        jog_seconds: recommendedLevel?.jog_seconds,
        walk_minutes: recommendedLevel?.walk_minutes,
        walk_seconds: recommendedLevel?.walk_seconds,
        reps_min: recommendedLevel?.reps_min,
        reps_max: recommendedLevel?.reps_max,
        speed_mph: recommendedLevel?.speed_mph,
        intensity: "easy",
      },
      rationale,
      oura_readiness: ouraReadiness,
    });
  } catch (error) {
    console.error("Recommendation error:", error);
    return NextResponse.json(
      { error: "Failed to generate recommendation" },
      { status: 500 }
    );
  }
}
