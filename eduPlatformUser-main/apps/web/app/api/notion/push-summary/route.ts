import { NextRequest, NextResponse } from "next/server";
import { createNotionPage } from "../../../lib/notion";

export async function POST(req: NextRequest) {
  const apiKey     = process.env.NOTION_API_KEY;
  const databaseId = process.env.NOTION_DATABASE_ID;

  if (!apiKey || !databaseId) {
    return NextResponse.json(
      { error: "Notion integration not configured. Add NOTION_API_KEY and NOTION_DATABASE_ID to your environment." },
      { status: 503 }
    );
  }

  let body: { topicName?: string; moduleName?: string; userEmail?: string; content?: string; level?: string; format?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { topicName, moduleName, userEmail, content, level, format } = body;
  if (!topicName || !content?.trim()) {
    return NextResponse.json({ error: "topicName and content are required" }, { status: 400 });
  }

  try {
    const pageId = await createNotionPage({
      databaseId,
      apiKey,
      topicName,
      moduleName,
      userEmail,
      content,
      type: "AI Summary",
      level,
      format,
    });
    return NextResponse.json({ pageId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
