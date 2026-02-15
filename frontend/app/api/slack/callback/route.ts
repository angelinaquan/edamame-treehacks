import { NextRequest, NextResponse } from "next/server";
import { exchangeSlackCode } from "@/lib/slack";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(
      new URL("/error?message=No+code+provided", request.url)
    );
  }

  try {
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/slack/callback`;
    await exchangeSlackCode(code, redirectUri);

    return NextResponse.redirect(
      new URL("/train?slack=connected", request.url)
    );
  } catch (error) {
    console.error("Slack callback error:", error);
    return NextResponse.redirect(
      new URL("/error?message=Slack+connection+failed", request.url)
    );
  }
}
