import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: "Missing userId" },
        { status: 400 }
      );
    }

    // Check if Oura is connected
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("athlete_profile")
      .select("oura_access_token, oura_synced_at")
      .eq("user_id", userId)
      .single();

    if (!profile?.oura_access_token) {
      return NextResponse.json({
        connected: false,
      });
    }

    // Get the most recent snapshot for this user
    const { data: latestSnapshot, error: snapshotError } = await supabaseAdmin
      .from("oura_daily_snapshot")
      .select("*")
      .eq("user_id", userId)
      .order("snapshot_date", { ascending: false })
      .limit(1)
      .single();

    console.log("Latest snapshot query result:", { latestSnapshot, snapshotError });

    if (snapshotError) {
      console.error("Snapshot query error:", snapshotError);
      return NextResponse.json({
        connected: true,
        lastSyncedAt: profile.oura_synced_at,
        todaySnapshot: null,
        resilience_score: null,
        resilience_level: null,
        rest_score: null,
        rest_level: null,
        activity_score: null,
        activity_level: null,
      });
    }

    // Calculate levels based on scores (0-100 scale)
    const getLevel = (score: number | null) => {
      if (score === null || score === undefined) return null;
      if (score >= 70) return 'green';
      if (score >= 50) return 'yellow';
      return 'red';
    };

    // Extract scores from snapshot
    const resilience_score = latestSnapshot?.readiness_score || null;
    const rest_score = latestSnapshot?.sleep_score || null;
    // Use activity_balance from readiness_contributors as activity score if activity_score is null
    const activity_score = latestSnapshot?.activity_score ||
      latestSnapshot?.readiness_contributors?.activity_balance || null;

    console.log("Extracted scores:", { resilience_score, rest_score, activity_score });

    return NextResponse.json({
      connected: true,
      lastSyncedAt: profile.oura_synced_at,
      todaySnapshot: latestSnapshot || null,
      resilience_score: resilience_score,
      resilience_level: getLevel(resilience_score),
      rest_score: rest_score,
      rest_level: getLevel(rest_score),
      activity_score: activity_score,
      activity_level: getLevel(activity_score),
    });
  } catch (error) {
    console.error("Oura status error:", error);
    return NextResponse.json(
      { error: "Failed to fetch Oura status", details: String(error) },
      { status: 500 }
    );
  }
}
