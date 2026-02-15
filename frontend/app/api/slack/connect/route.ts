import { NextResponse } from "next/server";
import { getSlackAuthUrl } from "@/lib/slack";

export async function GET() {
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/slack/callback`;
  const authUrl = getSlackAuthUrl(redirectUri);
  return NextResponse.redirect(authUrl);
}
