import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MODELS = [
  "meta-llama/llama-3.1-8b-instruct:free",
  "mistralai/mistral-7b-instruct:free",
  "google/gemini-2.0-flash-exp:free",
];

async function callOpenRouter(
  model: string,
  topicName: string,
  text: string
): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": "https://eduplatform.app",
        "X-Title": "EduPlatform",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 350,
        temperature: 0.3,
        messages: [
          {
            role: "user",
            content: `Summarize the educational topic "${topicName}" in 4-5 bullet points starting with "- ". Use simple, clear language. Only output the bullet points.\n\nContent:\n${text}`,
          },
        ],
      }),
      signal: controller.signal,
    });

    const data = await res.json();

    if (!res.ok) {
      console.error(`[summarize] ${model} HTTP ${res.status}:`, JSON.stringify(data));
      return null;
    }

    const summary = data.choices?.[0]?.message?.content?.trim();
    if (!summary) {
      console.error(`[summarize] ${model} empty content:`, JSON.stringify(data));
      return null;
    }

    return summary;
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      console.error(`[summarize] ${model} timed out after 20s`);
    } else {
      console.error(`[summarize] ${model} threw:`, err);
    }
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { topicId, topicName, content } = await req.json();

    if (!topicId) {
      return NextResponse.json({ error: "Missing topicId" }, { status: 400 });
    }

    // Check Supabase cache — same topic never hits API twice
    const { data: cached } = await supabaseAdmin
      .from("topic_summaries")
      .select("summary")
      .eq("topic_id", topicId)
      .maybeSingle();

    if (cached?.summary) {
      return NextResponse.json({ summary: cached.summary, cached: true });
    }

    if (!process.env.OPENROUTER_API_KEY) {
      console.error("[summarize] OPENROUTER_API_KEY missing in environment");
      return NextResponse.json(
        { error: "Server configuration error: API key not set." },
        { status: 503 }
      );
    }

    const text = content?.trim()
      ? content.trim().slice(0, 3000)
      : `Topic: ${topicName}. Provide a general educational summary.`;

    let summary: string | null = null;
    for (const model of MODELS) {
      console.log(`[summarize] trying model: ${model}`);
      summary = await callOpenRouter(model, topicName, text);
      if (summary) {
        console.log(`[summarize] success with model: ${model}`);
        break;
      }
    }

    if (!summary) {
      return NextResponse.json(
        { error: "All AI models failed. Please try again in a few seconds." },
        { status: 500 }
      );
    }

    await supabaseAdmin
      .from("topic_summaries")
      .upsert(
        { topic_id: topicId, summary },
        { onConflict: "topic_id", ignoreDuplicates: true }
      );

    return NextResponse.json({ summary, cached: false });
  } catch (err) {
    console.error("[summarize] Unexpected error:", err);
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
