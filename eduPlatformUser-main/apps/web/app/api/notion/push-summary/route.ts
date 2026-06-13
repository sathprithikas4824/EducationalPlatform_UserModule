import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createNotionPage, findOrCreateUserDatabase, createUserNotionPage } from "../../../lib/notion";
import { created, badRequest, validationError, serviceUnavailable, gatewayError } from "../../../lib/apiResponse";
import { sanitiseText } from "../../../lib/sanitise";
import { logger } from "../../../lib/logger";

const ROUTE = "/api/notion/push-summary";

export async function POST(req: NextRequest) {
  let body: {
    topicName?: string; moduleName?: string; userEmail?: string;
    content?: string; level?: string; format?: string; userId?: string;
  };
  try { body = await req.json(); }
  catch { return badRequest("Invalid JSON in request body"); }

  const { topicName, moduleName, userEmail, content, level, format, userId } = body;
  const cleanContent = sanitiseText(content ?? "");

  if (!topicName || !cleanContent) {
    logger.warn(ROUTE, "sync_summary", userId ?? "anonymous", "Validation failed: topicName or content missing", undefined, {
      topicName: topicName ?? "missing", hasContent: !!cleanContent,
    });
    return validationError("topicName and content are required");
  }

  // ── Try per-user Notion first ────────────────────────────────────────────────
  if (userId) {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data: tokenRow } = await supabaseAdmin
      .from("user_notion_tokens")
      .select("access_token, notion_database_id")
      .eq("user_id", userId)
      .maybeSingle() as { data: { access_token: string; notion_database_id: string | null } | null };

    if (tokenRow?.access_token) {
      try {
        let dbId = tokenRow.notion_database_id;
        if (!dbId) {
          dbId = await findOrCreateUserDatabase(tokenRow.access_token);
          if (dbId) {
            await supabaseAdmin
              .from("user_notion_tokens")
              .update({ notion_database_id: dbId })
              .eq("user_id", userId);
          }
        }
        if (dbId) {
          const pageId = await createUserNotionPage({
            accessToken: tokenRow.access_token,
            databaseId:  dbId,
            topicName:   topicName!,
            moduleName,
            content:     cleanContent,
            type:        "AI Summary",
            level,
            format,
          });
          logger.info(ROUTE, "sync_summary", userId, "Summary synced to user Notion", {
            topicName, moduleName, level, format, source: "user", pageId,
          });
          await supabaseAdmin.from("user_audit_logs").insert({ user_id: userId, action: "summary_synced_to_notion", category: "summary", metadata: { topicName, level, format }, status: "success" });
          return created({ pageId, source: "user" }, "Summary synced to Notion");
        }
      } catch (err) {
        logger.warn(ROUTE, "sync_summary", userId, "User Notion push failed, using admin fallback", err, {
          topicName, level,
        });
      }
    }
  }

  // ── Fall back to admin shared database ───────────────────────────────────────
  const apiKey     = process.env.NOTION_API_KEY;
  const databaseId = process.env.NOTION_DATABASE_ID;
  if (!apiKey || !databaseId) {
    logger.error(ROUTE, "sync_summary", userId ?? "anonymous", "Notion admin credentials not set in environment");
    return serviceUnavailable("Notion not configured. Connect your account in profile.");
  }

  try {
    const pageId = await createNotionPage({
      databaseId, apiKey, topicName: topicName!, moduleName,
      userEmail, content: cleanContent, type: "AI Summary", level, format,
    });
    logger.info(ROUTE, "sync_summary", userId ?? "anonymous", "Summary synced to admin Notion", {
      topicName, level, format, source: "admin", pageId,
    });
    return created({ pageId, source: "admin" }, "Summary synced to shared Notion");
  } catch (err) {
    if (userId) { const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!); await supabaseAdmin.from("user_audit_logs").insert({ user_id: userId, action: "summary_synced_to_notion", category: "summary", status: "failure", error_msg: err instanceof Error ? err.message : "Unknown error" }); }
    logger.error(ROUTE, "sync_summary", userId ?? "anonymous", "Summary sync failed — all Notion paths exhausted", err, {
      payload: { topicName, level },
    });
    const msg = err instanceof Error ? err.message : "Unknown error";
    return gatewayError(msg);
  }
}
