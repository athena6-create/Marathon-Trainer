import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { fetchOuraWorkouts, refreshOuraToken } from "@/lib/oura";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    // Get the user's Oura tokens
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("athlete_profile")
      .select("oura_access_token, oura_refresh_token")
      .eq("user_id", userId)
      .single();

    if (profileError || !profile?.oura_access_token) {
      return NextResponse.json(
        { error: "Oura not connected" },
        { status: 400 }
      );
    }

    // Calculate date range (last 30 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const formatDate = (d: Date) => d.toISOString().split("T")[0];
    const start = formatDate(startDate);
    const end = formatDate(endDate);

    let accessToken = profile.oura_access_token;

    // Fetch workouts
    let workoutData: any[] = [];
    try {
      workoutData = await fetchOuraWorkouts(accessToken, start, end);
    } catch (error: any) {
      if (error.message === "OURA_TOKEN_EXPIRED") {
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

    // Convert Oura workouts to app format - pull all workouts
    const workouts = workoutData.map((w: any) => {
      // Calculate duration in minutes from start_datetime and end_datetime
      let durationMinutes = null;
      if (w.start_datetime && w.end_datetime) {
        const startMs = new Date(w.start_datetime).getTime();
        const endMs = new Date(w.end_datetime).getTime();
        durationMinutes = Math.round((endMs - startMs) / (1000 * 60));
      } else {
        console.log(`Missing duration for ${w.activity}: start=${w.start_datetime}, end=${w.end_datetime}`);
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
        workout_type: "other", // Generic type for Oura workouts
        summary: w.label || activityName, // Use exact Oura activity name
        completed: true,
        duration_minutes: durationMinutes,
        raw_note: null,
        transcript: null,
      };
    });

    if (workoutData.length > 0) {
      console.log("First raw Oura workout:", JSON.stringify(workoutData[0], null, 2));
      console.log("First raw Oura workout keys:", Object.keys(workoutData[0]));
      // Log all unique activity types
      const uniqueActivities = [...new Set(workoutData.map((w: any) => w.activity))];
      console.log("All Oura activity types:", uniqueActivities);
    }
    // Log each workout's duration before filtering
    workouts.forEach((w: any) => {
      console.log(`Workout: ${w.summary} - Duration: ${w.duration_minutes} min`);
    });

    // Filter out workouts under 15 minutes
    const filteredWorkouts = workouts.filter((w: any) => !w.duration_minutes || w.duration_minutes >= 15);
    const filteredOutCount = workouts.length - filteredWorkouts.length;

    console.log(`Attempting to insert workouts: ${filteredWorkouts.length} (filtered out ${filteredOutCount} under 15 min)`);

    // Insert workouts (skip duplicates)
    if (filteredWorkouts.length > 0) {
      const { error: insertError } = await supabaseAdmin
        .from("workouts")
        .insert(filteredWorkouts);

      // Silently ignore duplicate key errors
      if (insertError && insertError.code !== "23505") {
        console.error("Insert error:", insertError);
        throw insertError;
      }
    }

    console.log("Successfully synced workouts");

    return NextResponse.json({
      success: true,
      synced_count: workouts.length,
      workouts,
    });
  } catch (error) {
    console.error("Sync workouts error:", error);
    return NextResponse.json(
      { error: "Failed to sync workouts", details: String(error) },
      { status: 500 }
    );
  }
}
