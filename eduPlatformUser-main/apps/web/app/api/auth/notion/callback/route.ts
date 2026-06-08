import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { logger } from "../../../../lib/logger";

const ROUTE = "/api/auth/notion/callback";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://educational-platform-user-module.vercel.app";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code  = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error || !code || !state) {
    logger.warn(ROUTE, "notion_oauth_complete", "unknown",
      "Notion callback missing code or state", error ?? "no error param", {
        hasCode: !!code, hasState: !!state,
      });
    return NextResponse.redirect(`${SITE_URL}/profile?tab=account&notion=error`);
  }

  // Decode state → userId
  let userId: string;
  try {
    const decoded = JSON.parse(Buffer.from(state, "base64url").toString()) as { userId?: string };
    if (!decoded.userId) throw new Error("missing userId");
    userId = decoded.userId;
  } catch (err) {
    logger.warn(ROUTE, "notion_oauth_complete", "unknown",
      "Failed to decode state param from Notion callback", err);
    return NextResponse.redirect(`${SITE_URL}/profile?tab=account&notion=error`);
  }

  const clientId     = process.env.NOTION_CLIENT_ID;
  const clientSecret = process.env.NOTION_CLIENT_SECRET;
  const redirectUri  = process.env.NOTION_REDIRECT_URI ?? `${SITE_URL}/api/auth/notion/callback`;

  if (!clientId || !clientSecret) {
    logger.error(ROUTE, "notion_oauth_complete", userId,
      "NOTION_CLIENT_ID or NOTION_CLIENT_SECRET not set in environment");
    return NextResponse.redirect(`${SITE_URL}/profile?tab=account&notion=not_configured`);
  }

  // Exchange code for access token
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  let tokenData: {
    access_token?: string; workspace_id?: string;
    workspace_name?: string; workspace_icon?: string; error?: string;
  };

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

    if (!tokenRes.ok || !tokenData.access_token) {
      logger.error(ROUTE, "notion_oauth_complete", userId,
        "Notion token exchange failed", tokenData.error, {
          payload: { httpStatus: tokenRes.status },
        });
      return NextResponse.redirect(`${SITE_URL}/profile?tab=account&notion=error`);
    }
  } catch (err) {
    logger.error(ROUTE, "notion_oauth_complete", userId,
      "Notion token exchange HTTP call failed", err);
    return NextResponse.redirect(`${SITE_URL}/profile?tab=account&notion=error`);
  }

  // Store token using service role (bypasses RLS)
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error: dbErr } = await supabaseAdmin.from("user_notion_tokens").upsert(
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

  if (dbErr) {
    logger.error(ROUTE, "notion_oauth_complete", userId,
      "Failed to store Notion token in Supabase", dbErr);
    return NextResponse.redirect(`${SITE_URL}/profile?tab=account&notion=error`);
  }

  logger.info(ROUTE, "notion_oauth_complete", userId, "Notion connected successfully", {
    workspaceName: tokenData.workspace_name ?? "unknown",
    workspaceId:   tokenData.workspace_id   ?? "unknown",
  });

  return NextResponse.redirect(`${SITE_URL}/profile?tab=account&notion=connected`);
}
