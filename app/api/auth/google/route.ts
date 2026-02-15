import { NextResponse } from "next/server";
import { google } from "googleapis";

/**
 * GET /api/auth/google
 *
 * Initiates the Google OAuth2 consent flow.
 * Redirects the user to Google's consent screen requesting
 * read-only access to Drive and Gmail.
 */
export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      {
        error:
          "Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.local.",
      },
      { status: 500 }
    );
  }

  const redirectUri = `${baseUrl}/api/auth/google/callback`;

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri
  );

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline", // request refresh token
    prompt: "consent", // always show consent to get refresh token
    scope: [
      "https://www.googleapis.com/auth/drive.readonly",
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/userinfo.email",
    ],
  });

  return NextResponse.redirect(authUrl);
}
