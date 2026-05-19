// Notion API helper — server-side only (used by /api/notion/* routes)
// Uses raw fetch so no SDK dependency is needed.

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
