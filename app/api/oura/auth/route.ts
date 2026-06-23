import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json(
      { error: "Missing userId parameter" },
      { status: 400 }
    );
  }

  const clientId = process.env.OURA_CLIENT_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!clientId || !appUrl) {
    return NextResponse.json(
      { error: "Missing OURA_CLIENT_ID or NEXT_PUBLIC_APP_URL env vars" },
      { status: 500 }
    );
  }

  const redirectUri = `${appUrl}/api/oura/callback`;

  // Build the Oura OAuth authorization URL
  const ouraAuthUrl = new URL("https://cloud.ouraring.com/oauth/authorize");
  ouraAuthUrl.searchParams.append("response_type", "code");
  ouraAuthUrl.searchParams.append("client_id", clientId);
  ouraAuthUrl.searchParams.append("redirect_uri", redirectUri);
  ouraAuthUrl.searchParams.append("scope", "daily heartrate personal workout");
  ouraAuthUrl.searchParams.append("state", userId); // Pass userId through OAuth state

  return NextResponse.redirect(ouraAuthUrl.toString());
}
