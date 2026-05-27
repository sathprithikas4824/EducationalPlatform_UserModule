import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createNotionPage, findOrCreateUserDatabase, createUserNotionPage } from "../../../lib/notion";
import { created, badRequest, validationError, serviceUnavailable, gatewayError } from "../../../lib/apiResponse";
import { sanitiseText } from "../../../lib/sanitise";

export async function POST(req: NextRequest) {
  let body: { topicName?: string; moduleName?: string; userEmail?: string; content?: string; level?: string; format?: string; userId?: string };
  try { body = await req.json(); }
  catch { return badRequest("Invalid JSON in request body"); }

  const { topicName, moduleName, userEmail, content, level, format, userId } = body;
  const cleanContent = sanitiseText(content ?? "");
  if (!topicName || !cleanContent) {
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
          return created({ pageId, source: "user" }, "Summary synced to Notion");
        }
      } catch (err) {
        console.warn("User Notion push failed, falling back to admin:", err instanceof Error ? err.message : err);
      }
    }
  }

  // ── Fall back to admin shared database ───────────────────────────────────────
  const apiKey     = process.env.NOTION_API_KEY;
  const databaseId = process.env.NOTION_DATABASE_ID;
  if (!apiKey || !databaseId) {
    return serviceUnavailable("Notion not configured. Connect your account in profile.");
  }

  try {
    const pageId = await createNotionPage({ databaseId, apiKey, topicName: topicName!, moduleName, userEmail, content: cleanContent, type: "AI Summary", level, format });
    return created({ pageId, source: "admin" }, "Summary synced to shared Notion");
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return gatewayError(msg);
  }
}
