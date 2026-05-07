import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const { topicId, topicName, content } = await req.json();

  if (!topicId || !content?.trim()) {
    return NextResponse.json({ error: "Missing topicId or content" }, { status: 400 });
  }

  // Check Supabase cache first — same topic is never summarized twice
  const { data: cached } = await supabaseAdmin
    .from("topic_summaries")
    .select("summary")
    .eq("topic_id", topicId)
    .maybeSingle();

  if (cached?.summary) {
    return NextResponse.json({ summary: cached.summary, cached: true });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "AI summarization is not configured." }, { status: 503 });
  }

  // Truncate to 4000 chars to control cost and latency
  const truncated = content.trim().slice(0, 4000);

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 400,
    system: "You are an educational content summarizer. Respond only with a concise summary in 4-5 clear bullet points using simple language. Do not add headers or extra text.",
    messages: [
      {
        role: "user",
        content: `Summarize this topic: "${topicName}"\n\n${truncated}`,
      },
    ],
  });

  const summary =
    message.content[0].type === "text" ? message.content[0].text.trim() : "";

  if (!summary) {
    return NextResponse.json({ error: "Failed to generate summary." }, { status: 500 });
  }

  // Save to Supabase cache — ignore conflict if another request raced us
  await supabaseAdmin
    .from("topic_summaries")
    .upsert({ topic_id: topicId, summary }, { onConflict: "topic_id", ignoreDuplicates: true });

  return NextResponse.json({ summary, cached: false });
}
