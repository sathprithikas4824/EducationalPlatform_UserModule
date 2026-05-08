import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Primary free model — fallback if primary fails
const PRIMARY_MODEL = "meta-llama/llama-3.1-8b-instruct:free";
const FALLBACK_MODEL = "mistralai/mistral-7b-instruct:free";

async function callOpenRouter(model: string, topicName: string, truncated: string) {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "HTTP-Referer": "https://eduplatform.app",
      "X-Title": "EduPlatform",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 400,
      messages: [
        {
          role: "user",
          content: `You are an educational content summarizer. Summarize the topic "${topicName}" in 4-5 clear bullet points using simple language. Only output the bullet points, nothing else.\n\n${truncated}`,
        },
      ],
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error(`OpenRouter [${model}] error:`, JSON.stringify(data));
    return null;
  }

  const summary: string = data.choices?.[0]?.message?.content?.trim() ?? "";
  return summary || null;
}

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

  // Try primary model first, fall back to secondary if it fails
  let summary = await callOpenRouter(PRIMARY_MODEL, topicName, truncated);

  if (!summary) {
    console.warn("Primary model failed, trying fallback model...");
    summary = await callOpenRouter(FALLBACK_MODEL, topicName, truncated);
  }

  if (!summary) {
    return NextResponse.json({ error: "Failed to generate summary. Please try again." }, { status: 500 });
  }

  // Save to Supabase cache — same topic never hits the API twice
  await supabaseAdmin
    .from("topic_summaries")
    .upsert({ topic_id: topicId, summary }, { onConflict: "topic_id", ignoreDuplicates: true });

  return NextResponse.json({ summary, cached: false });
}
