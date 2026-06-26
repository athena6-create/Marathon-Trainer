import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { fetchOuraWorkouts, refreshOuraToken } from "@/lib/oura";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    console.log(`\n=== OURA SYNC START (User: ${userId}) ===`);

    // Get user's Oura tokens
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("athlete_profile")
      .select("oura_access_token, oura_refresh_token")
      .eq("user_id", userId)
      .single();

    if (profileError || !profile?.oura_access_token) {
      console.log("Oura not connected");
      return NextResponse.json({ error: "Oura not connected" }, { status: 400 });
    }

    // Calculate date range (60 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 60);

    const formatDate = (d: Date) => d.toISOString().split("T")[0];
    const start = formatDate(startDate);
    const end = formatDate(endDate);

    console.log(`Date range: ${start} to ${end}`);

    let accessToken = profile.oura_access_token;

    // Fetch workouts from Oura
    let workoutData: any[] = [];
    try {
      workoutData = await fetchOuraWorkouts(accessToken, start, end);
    } catch (error: any) {
      if (error.message === "OURA_TOKEN_EXPIRED") {
        console.log("Token expired, refreshing...");
        const newTokens = await refreshOuraToken(profile.oura_refresh_token);
        accessToken = newTokens.access_token;

        await supabaseAdmin
          .from("athlete_profile")
          .update({
            oura_access_token: newTokens.access_token,
            oura_refresh_token: newTokens.refresh_token,
          })
          .eq("user_id", userId);

        workoutData = await fetchOuraWorkouts(accessToken, start, end);
      } else {
        throw error;
      }
    }

    console.log(`Oura returned ${workoutData.length} workouts`);

    // Convert Oura workouts to app format
    const workouts = workoutData.map((w: any) => {
      // Calculate duration from start/end times
      let durationMinutes = null;
      if (w.start_datetime && w.end_datetime) {
        const startMs = new Date(w.start_datetime).getTime();
        const endMs = new Date(w.end_datetime).getTime();
        durationMinutes = Math.round((endMs - startMs) / (1000 * 60));
      }

      // Format activity name (e.g., "mountainBiking" → "Mountain Biking")
      const activityName = w.activity
        ? w.activity
            .replace(/([A-Z])/g, ' $1')
            .trim()
            .split(' ')
            .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ')
        : 'Workout';

      return {
        user_id: userId,
        workout_date: w.day,
        workout_type: "other",
        summary: w.label || activityName,
        completed: true,
        duration_minutes: durationMinutes,
        raw_note: null,
        transcript: null,
      };
    });

    // Check which workouts already exist in database
    console.log(`Checking for existing workouts...`);
    const { data: existingWorkouts } = await supabaseAdmin
      .from("workouts")
      .select("workout_date,workout_type,summary")
      .eq("user_id", userId);

    const existingKeys = new Set(
      (existingWorkouts || []).map(
        (w: any) => `${w.workout_date}-${w.workout_type}-${w.summary}`
      )
    );

    // Filter to only new workouts
    const newWorkouts = workouts.filter((w: any) => {
      const key = `${w.workout_date}-${w.workout_type}-${w.summary}`;
      return !existingKeys.has(key);
    });

    console.log(
      `Found ${newWorkouts.length} new workouts (${existingWorkouts?.length || 0} already exist)`
    );

    // Insert only new workouts
    if (newWorkouts.length > 0) {
      const { error: insertError } = await supabaseAdmin
        .from("workouts")
        .insert(newWorkouts);

      if (insertError) {
        console.error(`Insert error:`, insertError);
        throw insertError;
      }

      console.log(`✅ Successfully inserted ${newWorkouts.length} workouts`);
    } else {
      console.log(`ℹ️ No new workouts to insert`);
    }

    console.log(`=== OURA SYNC END ===\n`);

    return NextResponse.json({
      success: true,
      new_count: newWorkouts.length,
      existing_count: existingWorkouts?.length || 0,
    });
  } catch (error) {
    console.error("Sync error:", error);
    return NextResponse.json(
      { error: "Failed to sync workouts", details: String(error) },
      { status: 500 }
    );
  }
}
