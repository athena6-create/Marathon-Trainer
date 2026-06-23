import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Use the service role to insert the user (bypasses RLS)
    const { error } = await supabaseAdmin
      .from("users")
      .insert([
        {
          id: user.id,
          email: user.email,
          name: user.user_metadata?.name,
        },
      ])
      .select();

    // If it fails due to duplicate, that's OK - user already exists
    if (error && error.code !== "23505") {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error ensuring user:", error);
    return NextResponse.json(
      { error: "Failed to ensure user exists" },
      { status: 500 }
    );
  }
}
