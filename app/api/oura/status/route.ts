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
    const { data: profile } = await supabaseAdmin
      .from("athlete_profile")
      .select("oura_access_token, oura_synced_at")
      .eq("user_id", userId)
      .single();

    if (!profile?.oura_access_token) {
      return NextResponse.json({
        connected: false,
      });
    }

    // Get today's snapshot, or yesterday's if today's doesn't exist yet
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

    const { data: todaySnapshot } = await supabaseAdmin
      .from("oura_daily_snapshot")
      .select("*")
      .eq("user_id", userId)
      .eq("snapshot_date", today)
      .single();

    let snapshotToUse = todaySnapshot;

    // If no data for today, try yesterday
    if (!snapshotToUse) {
      const { data: yesterdaySnapshot } = await supabaseAdmin
        .from("oura_daily_snapshot")
        .select("*")
        .eq("user_id", userId)
        .eq("snapshot_date", yesterday)
        .single();
      snapshotToUse = yesterdaySnapshot;
    }

    // Get last 14 days to calculate baselines
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const startDate = twoWeeksAgo.toISOString().split("T")[0];

    const { data: recentSnapshots } = await supabaseAdmin
      .from("oura_daily_snapshot")
      .select("sleep_score, readiness_score, activity_score")
      .eq("user_id", userId)
      .gte("snapshot_date", startDate)
      .lte("snapshot_date", today);

    // Calculate levels based on scores (0-100 scale)
    const getLevel = (score: number | null) => {
      if (score === null) return null;
      if (score >= 70) return 'green';
      if (score >= 50) return 'yellow';
      return 'red';
    };

    // Get today's scores
    const resilience_score = snapshotToUse?.readiness_score || null;
    const rest_score = snapshotToUse?.sleep_score || null;
    const activity_score = snapshotToUse?.activity_score || null;

    return NextResponse.json({
      connected: true,
      lastSyncedAt: profile.oura_synced_at,
      todaySnapshot: snapshotToUse || null,
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
