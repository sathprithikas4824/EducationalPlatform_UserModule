import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://educational-platform-user-module.vercel.app";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code  = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error || !code || !state) {
    return NextResponse.redirect(`${SITE_URL}/profile?tab=account&notion=error`);
  }

  // Decode state → userId
  let userId: string;
  try {
    const decoded = JSON.parse(Buffer.from(state, "base64url").toString()) as { userId?: string };
    if (!decoded.userId) throw new Error("missing userId");
    userId = decoded.userId;
  } catch {
    return NextResponse.redirect(`${SITE_URL}/profile?tab=account&notion=error`);
  }

  const clientId     = process.env.NOTION_CLIENT_ID;
  const clientSecret = process.env.NOTION_CLIENT_SECRET;
  const redirectUri  = process.env.NOTION_REDIRECT_URI ?? `${SITE_URL}/api/auth/notion/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${SITE_URL}/profile?tab=account&notion=not_configured`);
  }

  // Exchange code for access token
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  let tokenData: { access_token?: string; workspace_id?: string; workspace_name?: string; workspace_icon?: string; error?: string };

  try {
    const tokenRes = await fetch("https://api.notion.com/v1/oauth/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ grant_type: "authorization_code", code, redirect_uri: redirectUri }),
    });
    tokenData = await tokenRes.json() as typeof tokenData;
  } catch {
    return NextResponse.redirect(`${SITE_URL}/profile?tab=account&notion=error`);
  }

  if (!tokenData.access_token) {
    console.error("Notion token exchange failed:", tokenData.error);
    return NextResponse.redirect(`${SITE_URL}/profile?tab=account&notion=error`);
  }

  // Store token using service role (bypasses RLS)
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  await supabaseAdmin.from("user_notion_tokens").upsert(
    {
      user_id:        userId,
      access_token:   tokenData.access_token,
      workspace_id:   tokenData.workspace_id   ?? null,
      workspace_name: tokenData.workspace_name ?? null,
      workspace_icon: tokenData.workspace_icon ?? null,
      updated_at:     new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  return NextResponse.redirect(`${SITE_URL}/profile?tab=account&notion=connected`);
}
