import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Free model via OpenRouter — no cost, no credit card needed
const OPENROUTER_MODEL = "google/gemini-2.0-flash-exp:free";

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

  if (!process.env.OPENROUTER_API_KEY) {
    return NextResponse.json({ error: "AI summarization is not configured." }, { status: 503 });
  }

  // Truncate to 4000 chars to control cost and latency
  const truncated = content.trim().slice(0, 4000);

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "HTTP-Referer": "https://eduplatform.app",
      "X-Title": "EduPlatform",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      max_tokens: 400,
      messages: [
        {
          role: "system",
          content:
            "You are an educational content summarizer. Respond only with a concise summary in 4-5 clear bullet points using simple language. Do not add headers or extra text.",
        },
        {
          role: "user",
          content: `Summarize this topic: "${topicName}"\n\n${truncated}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error("OpenRouter error:", err);
    return NextResponse.json({ error: "Failed to generate summary." }, { status: 500 });
  }

  const data = await response.json();
  const summary: string = data.choices?.[0]?.message?.content?.trim() ?? "";

  if (!summary) {
    return NextResponse.json({ error: "Empty response from AI." }, { status: 500 });
  }

  // Save to Supabase cache — same topic never hits the API twice
  await supabaseAdmin
    .from("topic_summaries")
    .upsert({ topic_id: topicId, summary }, { onConflict: "topic_id", ignoreDuplicates: true });

  return NextResponse.json({ summary, cached: false });
}
