import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { createServerSupabaseClient } from "@/lib/core/supabase/server";

/**
 * GET /api/auth/google/callback?code=...
 *
 * Handles the OAuth2 callback from Google.
 * Exchanges the authorization code for tokens,
 * fetches the user's email, and stores everything
 * in the integration_credentials table.
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const settingsUrl = `${baseUrl}/settings`;

  if (error) {
    console.error("Google OAuth error:", error);
    return NextResponse.redirect(
      `${settingsUrl}?google_error=${encodeURIComponent(error)}`
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${settingsUrl}?google_error=${encodeURIComponent("No authorization code received")}`
    );
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      `${settingsUrl}?google_error=${encodeURIComponent("OAuth not configured on server")}`
    );
  }

  const redirectUri = `${baseUrl}/api/auth/google/callback`;

  try {
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Fetch user email
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    const userEmail = userInfo.data.email ?? "unknown";

    // Store tokens in integration_credentials
    const supabase = createServerSupabaseClient();
    const { error: dbError } = await supabase
      .from("integration_credentials")
      .upsert(
        {
          provider: "google_drive",
          config: {
            auth_type: "oauth",
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expiry_date: tokens.expiry_date,
            user_email: userEmail,
          },
          updated_at: new Date().toISOString(),
        },
        { onConflict: "provider" }
      );

    if (dbError) {
      console.error("Failed to store Google tokens:", dbError);
      return NextResponse.redirect(
        `${settingsUrl}?google_error=${encodeURIComponent("Failed to save credentials")}`
      );
    }

    return NextResponse.redirect(
      `${baseUrl}/auth/complete?email=${encodeURIComponent(userEmail)}`
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown OAuth error";
    console.error("Google OAuth callback error:", err);
    return NextResponse.redirect(
      `${settingsUrl}?google_error=${encodeURIComponent(message)}`
    );
  }
}
