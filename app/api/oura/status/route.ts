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
      .select("hrv, resting_heart_rate, sleep_score, readiness_score, activity_score, rest_score, resilience_score")
      .eq("user_id", userId)
      .gte("snapshot_date", startDate)
      .lte("snapshot_date", today);

    // Calculate baselines
    let baselineHrv = 0;
    let baselineRestingHr = 0;
    let baselineSleepScore = 0;
    let baselineReadiness = 0;

    if (recentSnapshots && recentSnapshots.length > 0) {
      const validHrv = recentSnapshots.filter((s) => s.hrv && s.hrv > 0);
      const validRhr = recentSnapshots.filter((s) => s.resting_heart_rate && s.resting_heart_rate > 0);
      const validSleep = recentSnapshots.filter((s) => s.sleep_score);
      const validReadiness = recentSnapshots.filter((s) => s.readiness_score);

      if (validHrv.length > 0) {
        baselineHrv = Math.round(
          validHrv.reduce((sum, s) => sum + (s.hrv || 0), 0) / validHrv.length
        );
      }

      if (validRhr.length > 0) {
        baselineRestingHr = Math.round(
          validRhr.reduce((sum, s) => sum + (s.resting_heart_rate || 0), 0) / validRhr.length
        );
      }

      if (validSleep.length > 0) {
        baselineSleepScore = Math.round(
          validSleep.reduce((sum, s) => sum + (s.sleep_score || 0), 0) / validSleep.length
        );
      }

      if (validReadiness.length > 0) {
        baselineReadiness = Math.round(
          validReadiness.reduce((sum, s) => sum + (s.readiness_score || 0), 0) / validReadiness.length
        );
      }
    }

    // Extract scores from snapshot
    const resilience_score = snapshotToUse?.resilience_score || null;
    const rest_score = snapshotToUse?.rest_score || null;
    const activity_score = snapshotToUse?.activity_score || null;

    // Calculate levels based on scores (0-100 scale)
    const getLevel = (score: number | null) => {
      if (score === null) return null;
      if (score >= 70) return 'green';
      if (score >= 50) return 'yellow';
      return 'red';
    };

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
      baselines: {
        hrv: baselineHrv,
        restingHeartRate: baselineRestingHr,
        sleepScore: baselineSleepScore,
        readinessScore: baselineSleepScore,
      },
    });
  } catch (error) {
    console.error("Oura status error:", error);
    return NextResponse.json(
      { error: "Failed to fetch Oura status", details: String(error) },
      { status: 500 }
    );
  }
}
