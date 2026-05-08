import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Ordered list — tries each model until one succeeds
const MODELS = [
  "meta-llama/llama-3.1-8b-instruct:free",
  "mistralai/mistral-7b-instruct:free",
  "qwen/qwen-2.5-7b-instruct:free",
];

async function callOpenRouter(model: string, topicName: string, text: string): Promise<string | null> {
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
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
        temperature: 0.5,
        messages: [
          {
            role: "user",
            content: `Summarize the educational topic "${topicName}" in exactly 4-5 bullet points. Each bullet point should start with "- ". Be concise and use simple language.\n\nContent:\n${text}`,
          },
        ],
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error(`[summarize] model=${model} status=${res.status}`, JSON.stringify(data));
      return null;
    }

    const summary = data.choices?.[0]?.message?.content?.trim();
    if (!summary) {
      console.error(`[summarize] model=${model} empty response`, JSON.stringify(data));
      return null;
    }

    return summary;
  } catch (err) {
    console.error(`[summarize] model=${model} threw:`, err);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { topicId, topicName, content } = await req.json();

    if (!topicId) {
      return NextResponse.json({ error: "Missing topicId" }, { status: 400 });
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
      console.error("[summarize] OPENROUTER_API_KEY is not set");
      return NextResponse.json({ error: "AI summarization is not configured on the server." }, { status: 503 });
    }

    // If no content, generate a generic summary request
    const text = content?.trim()
      ? content.trim().slice(0, 4000)
      : `This is an educational topic called "${topicName}". Please provide a general summary.`;

    // Try each model in order until one succeeds
    let summary: string | null = null;
    for (const model of MODELS) {
      summary = await callOpenRouter(model, topicName, text);
      if (summary) break;
    }

    if (!summary) {
      return NextResponse.json({ error: "All AI models failed. Please try again." }, { status: 500 });
    }

    // Save to Supabase cache
    await supabaseAdmin
      .from("topic_summaries")
      .upsert({ topic_id: topicId, summary }, { onConflict: "topic_id", ignoreDuplicates: true });

    return NextResponse.json({ summary, cached: false });
  } catch (err) {
    console.error("[summarize] Unexpected error:", err);
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
