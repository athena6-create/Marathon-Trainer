import { NextRequest, NextResponse } from "next/server";
import { exchangeOuraCode } from "@/lib/oura";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state"); // userId from the auth request

  if (!code || !state) {
    return NextResponse.redirect(
      new URL("/profile?oura=error", request.url).toString()
    );
  }

  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) {
      throw new Error("Missing NEXT_PUBLIC_APP_URL");
    }

    const redirectUri = `${appUrl}/api/oura/callback`;

    // Exchange the authorization code for tokens
    const tokens = await exchangeOuraCode(code, redirectUri);

    // Get the user's Oura user ID from a personal info call
    const personalInfoResponse = await fetch(
      "https://api.ouraring.com/v2/usercollection/personal_info",
      {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
        },
      }
    );

    let ouraUserId = "";
    if (personalInfoResponse.ok) {
      const personalInfo = await personalInfoResponse.json();
      ouraUserId = personalInfo.id || "";
    }

    // Store tokens in the athlete_profile for this user
    const { error } = await supabaseAdmin
      .from("athlete_profile")
      .update({
        oura_access_token: tokens.access_token,
        oura_refresh_token: tokens.refresh_token,
        oura_user_id: ouraUserId,
        oura_synced_at: new Date().toISOString(),
      })
      .eq("user_id", state);

    if (error) {
      console.error("Failed to store Oura tokens:", error);
      return NextResponse.redirect(
        new URL("/profile?oura=error", request.url).toString()
      );
    }

    // Redirect back to profile with success message
    return NextResponse.redirect(
      new URL("/profile?oura=connected", request.url).toString()
    );
  } catch (error) {
    console.error("OAuth callback error:", error);
    return NextResponse.redirect(
      new URL("/profile?oura=error", request.url).toString()
    );
  }
}
