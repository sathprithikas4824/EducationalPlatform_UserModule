// Notion API helper — server-side only (used by /api/notion/* routes)
// Supports both admin (shared database) and per-user OAuth tokens.

const NOTION_API = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";

function headers(apiKey: string) {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "Notion-Version": NOTION_VERSION,
  };
}

// Convert plain text / bullet lines into Notion block objects.
// Supports:  "# Heading"  →  heading_2
//            "- item"     →  bulleted_list_item
//            plain text   →  paragraph
function textToBlocks(text: string): object[] {
  return text
    .split("\n")
    .filter((l) => l.trim())
    .map((line) => {
      const heading = line.match(/^#{1,3}\s+(.*)/);
      const bullet  = line.match(/^[-•*]\s+(.*)/);
      const content = (heading?.[1] ?? bullet?.[1] ?? line).slice(0, 2000);

      if (heading) {
        return {
          object: "block",
          type: "heading_2",
          heading_2: { rich_text: [{ type: "text", text: { content } }] },
        };
      }
      if (bullet) {
        return {
          object: "block",
          type: "bulleted_list_item",
          bulleted_list_item: { rich_text: [{ type: "text", text: { content } }] },
        };
      }
      return {
        object: "block",
        type: "paragraph",
        paragraph: { rich_text: [{ type: "text", text: { content } }] },
      };
    })
    .slice(0, 100); // Notion API allows max 100 blocks per request
}

export interface NotionPagePayload {
  databaseId: string;
  apiKey: string;
  topicName: string;
  moduleName?: string;
  userEmail?: string;
  content: string;
  type: "Note" | "AI Summary";
  level?: string;   // Professional / Simple / Basic
  format?: string;  // bullets / paragraph
}

export async function createNotionPage(p: NotionPagePayload): Promise<string> {
  const title =
    p.type === "AI Summary"
      ? `Summary: ${p.topicName}${p.level ? ` (${p.level})` : ""}`
      : `Note: ${p.topicName}`;

  const properties: Record<string, unknown> = {
    Name:  { title:     [{ text: { content: title } }] },
    Topic: { rich_text: [{ text: { content: p.topicName } }] },
    Type:  { select:    { name: p.type } },
  };

  if (p.moduleName) properties.Module     = { rich_text: [{ text: { content: p.moduleName } }] };
  if (p.userEmail)  properties["User Email"] = { email: p.userEmail };
  if (p.type === "AI Summary") {
    if (p.level)  properties.Level  = { select: { name: p.level } };
    if (p.format) properties.Format = { select: { name: p.format === "bullets" ? "Bullets" : "Paragraph" } };
  }

  const res = await fetch(`${NOTION_API}/pages`, {
    method: "POST",
    headers: headers(p.apiKey),
    body: JSON.stringify({
      parent:   { database_id: p.databaseId },
      properties,
      children: textToBlocks(p.content),
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(err.message ?? `Notion API ${res.status}`);
  }

  const data = await res.json() as { id: string };
  return data.id;
}

// ── Per-user Notion (OAuth) — pages, not a database ──────────────────────────

async function notionFetch(path: string, method: string, token: string, body?: unknown) {
  const res = await fetch(`${NOTION_API}${path}`, {
    method,
    headers: headers(token),
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

// Find or create the "EduPlatform Notes" parent page in user's workspace.
// The id is stored in user_notion_tokens.notion_database_id (reusing the column).
export async function findOrCreateUserDatabase(accessToken: string): Promise<string | null> {
  try {
    // Search for existing parent page
    const search = await notionFetch("/search", "POST", accessToken, {
      query: "EduPlatform Notes",
      filter: { value: "page", property: "object" },
    }) as { results?: { id: string; properties?: { title?: { title?: { plain_text?: string }[] } } }[] };

    const existing = search.results?.find(
      (r) => r.properties?.title?.title?.[0]?.plain_text === "EduPlatform Notes"
    );
    if (existing) return existing.id;

    // Create a workspace-level page
    const page = await notionFetch("/pages", "POST", accessToken, {
      parent: { type: "workspace", workspace: true },
      icon:   { type: "emoji", emoji: "📚" },
      properties: {
        title: { title: [{ type: "text", text: { content: "EduPlatform Notes" } }] },
      },
    }) as { id?: string };

    return page.id ?? null;
  } catch (err) {
    console.error("findOrCreateUserDatabase error:", err);
    return null;
  }
}

export interface UserNotionPagePayload {
  accessToken:  string;
  databaseId:   string; // actually the parent page id
  topicName:    string;
  moduleName?:  string;
  content:      string;
  type:         "Note" | "AI Summary";
  level?:       string;
  format?:      string;
}

export async function createUserNotionPage(p: UserNotionPagePayload): Promise<string> {
  const isNote = p.type === "Note";
  const title  = isNote
    ? `📝 ${p.topicName}`
    : `✨ Summary: ${p.topicName}${p.level ? ` (${p.level})` : ""}`;

  // Meta info block shown at the top of the page
  const metaLines = [
    p.moduleName ? `📁 Module: ${p.moduleName}` : null,
    `📖 Topic: ${p.topicName}`,
    !isNote && p.level  ? `🎯 Level: ${p.level}`  : null,
    !isNote && p.format ? `📄 Format: ${p.format === "bullets" ? "Bullet points" : "Paragraph"}` : null,
    `🗓️ Saved: ${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}`,
  ].filter(Boolean).join("\n");

  const metaBlock = {
    object: "block",
    type: "callout",
    callout: {
      rich_text: [{ type: "text", text: { content: metaLines } }],
      icon: { type: "emoji", emoji: isNote ? "📌" : "🤖" },
      color: isNote ? "yellow_background" : "purple_background",
    },
  };

  const divider = { object: "block", type: "divider", divider: {} };

  const res = await fetch(`${NOTION_API}/pages`, {
    method: "POST",
    headers: headers(p.accessToken),
    body: JSON.stringify({
      parent:   { page_id: p.databaseId },
      icon:     { type: "emoji", emoji: isNote ? "📝" : "✨" },
      properties: {
        title: { title: [{ text: { content: title } }] },
      },
      children: [metaBlock, divider, ...textToBlocks(p.content)],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(err.message ?? `Notion API ${res.status}`);
  }

  const data = await res.json() as { id: string };
  return data.id;
}

// Update the content of an existing Notion page (delete all blocks, re-append).
export async function updateUserNotionPage(
  accessToken: string,
  pageId: string,
  content: string,
  props: { topicName: string; moduleName?: string; type: "Note" | "AI Summary"; level?: string; format?: string }
): Promise<void> {
  // 1. Fetch existing child blocks
  const existing = await notionFetch(`/blocks/${pageId}/children`, "GET", accessToken) as {
    results?: { id: string }[];
  };

  // 2. Delete (archive) every existing block
  if (existing.results?.length) {
    await Promise.all(existing.results.map((b) => notionFetch(`/blocks/${b.id}`, "DELETE", accessToken)));
  }

  // 3. Build fresh content
  const isNote = props.type === "Note";
  const metaLines = [
    props.moduleName ? `📁 Module: ${props.moduleName}` : null,
    `📖 Topic: ${props.topicName}`,
    `🗓️ Last updated: ${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}`,
  ].filter(Boolean).join("\n");

  const metaBlock = {
    object: "block", type: "callout",
    callout: {
      rich_text: [{ type: "text", text: { content: metaLines } }],
      icon:  { type: "emoji", emoji: "📌" },
      color: isNote ? "yellow_background" : "purple_background",
    },
  };

  // 4. Append new blocks
  await notionFetch(`/blocks/${pageId}/children`, "PATCH", accessToken, {
    children: [metaBlock, { object: "block", type: "divider", divider: {} }, ...textToBlocks(content)],
  });
}
