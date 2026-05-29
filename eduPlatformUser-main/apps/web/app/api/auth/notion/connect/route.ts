import { NextRequest, NextResponse } from "next/server";
import { validationError } from "../../../../lib/apiResponse";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://educational-platform-user-module.vercel.app";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) return validationError("userId is required");

  const clientId = process.env.NOTION_CLIENT_ID;
  if (!clientId) {
    return NextResponse.redirect(`${SITE_URL}/profile?tab=account&notion=not_configured`);
  }

  const redirectUri = process.env.NOTION_REDIRECT_URI ?? `${SITE_URL}/api/auth/notion/callback`;
  const state = Buffer.from(JSON.stringify({ userId })).toString("base64url");

  const url = new URL("https://api.notion.com/v1/oauth/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("owner", "user");
  url.searchParams.set("state", state);

  return NextResponse.redirect(url.toString());
}
