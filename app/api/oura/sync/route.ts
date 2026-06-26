import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  fetchOuraDailySleep,
  fetchOuraDailyReadiness,
  fetchOuraDailyActivity,
  refreshOuraToken,
} from "@/lib/oura";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: "Missing userId" },
        { status: 400 }
      );
    }

    // Get the user's Oura tokens (use admin client to bypass RLS)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("athlete_profile")
      .select("oura_access_token, oura_refresh_token, oura_user_id")
      .eq("user_id", userId)
      .single();

    if (profileError) {
      console.error("Profile query error:", profileError);
      return NextResponse.json(
        { error: "User profile not found", details: profileError },
        { status: 404 }
      );
    }

    if (!profile) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }

    if (!profile.oura_access_token || !profile.oura_refresh_token) {
      return NextResponse.json(
        { error: "Oura not connected" },
        { status: 400 }
      );
    }

    // Calculate date range (last 7 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    const formatDate = (d: Date) => d.toISOString().split("T")[0];
    const start = formatDate(startDate);
    const end = formatDate(endDate);

    let accessToken = profile.oura_access_token;

    // Fetch sleep, readiness, and activity data
    let sleepData: any[] = [];
    let readinessData: any[] = [];
    let activityData: any[] = [];

    try {
      sleepData = await fetchOuraDailySleep(accessToken, start, end);
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
        sleepData = await fetchOuraDailySleep(accessToken, start, end);
      } else {
        throw error;
      }
    }

    try {
      readinessData = await fetchOuraDailyReadiness(accessToken, start, end);
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
        readinessData = await fetchOuraDailyReadiness(accessToken, start, end);
      } else {
        throw error;
      }
    }

    try {
      activityData = await fetchOuraDailyActivity(accessToken, start, end);
      console.log("Activity data fetched:", JSON.stringify(activityData, null, 2));
    } catch (error: any) {
      console.error("Activity fetch error:", error.message);
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
        activityData = await fetchOuraDailyActivity(accessToken, start, end);
        console.log("Activity data fetched after token refresh:", activityData);
      } else {
        console.warn("Failed to fetch activity data, continuing without it:", error.message);
      }
    }

    // Create maps for easy lookup by date
    const readinessMap = new Map(readinessData.map((r: any) => [r.day, r]));
    const activityMap = new Map(activityData.map((a: any) => [a.day, a]));

    // Upsert sleep data + readiness data + activity data into oura_daily_snapshot
    const snapshots = sleepData.map((sleep: any) => {
      const readiness = readinessMap.get(sleep.day);
      const activity = activityMap.get(sleep.day);

      // Extract activity score - try multiple field names
      let activityScore = null;
      if (activity) {
        activityScore = activity.score || activity.activity_score || activity.activityScore || null;
      }

      const snapshot = {
        user_id: userId,
        snapshot_date: sleep.day,
        sleep_duration: Math.round(sleep.total_sleep_duration / 60),
        sleep_score: sleep.score,
        sleep_deep: Math.round((sleep.contributors?.deep_sleep || 0) / 60),
        sleep_light: Math.round((sleep.contributors?.light_sleep || 0) / 60),
        sleep_rem: Math.round((sleep.contributors?.rem_sleep || 0) / 60),
        sleep_latency: Math.round((sleep.latency || 0) / 60),
        readiness_score: readiness?.score || null,
        readiness_contributors: readiness?.contributors || null,
        resting_heart_rate: readiness?.resting_heart_rate || null,
        hrv: Math.round(sleep.average_hrv || 0),
        body_temperature_deviation: readiness?.temperature_deviation || null,
        activity_score: activityScore,
        active_calories: activity?.active_calories || null,
        steps: activity?.steps || null,
        synced_at: new Date().toISOString(),
      };

      if (activity) {
        console.log(`\n=== Activity for ${sleep.day} ===`);
        console.log(`Raw activity object:`, JSON.stringify(activity, null, 2));
        console.log(`Extracted activity_score: ${snapshot.activity_score}`);
        console.log(`Activity keys: ${Object.keys(activity).join(', ')}`);
      } else {
        console.log(`No activity data for ${sleep.day}`);
      }

      return snapshot;
    });

    // Upsert into oura_daily_snapshot (use service role to bypass RLS)
    console.log("Attempting to upsert snapshots:", snapshots.length);
    const { error: upsertError } = await supabaseAdmin
      .from("oura_daily_snapshot")
      .upsert(snapshots);

    if (upsertError) {
      // Ignore duplicate key errors (data already synced)
      if (upsertError.code === "23505") {
        console.log("Data already synced, skipping duplicates");
      } else {
        console.error("Failed to upsert Oura snapshots:", upsertError);
        return NextResponse.json(
          { error: "Failed to save Oura data", details: upsertError },
          { status: 500 }
        );
      }
    }

    console.log("Successfully upserted snapshots");

    // Update the oura_synced_at timestamp on the profile
    await supabaseAdmin
      .from("athlete_profile")
      .update({
        oura_synced_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    return NextResponse.json({
      success: true,
      synced_days: snapshots.length,
      snapshots,
    });
  } catch (error) {
    console.error("Oura sync error:", error);
    return NextResponse.json(
      { error: "Sync failed", details: String(error) },
      { status: 500 }
    );
  }
}
