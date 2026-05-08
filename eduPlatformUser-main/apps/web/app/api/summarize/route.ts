import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function callGroq(topicName: string, text: string): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        max_tokens: 400,
        temperature: 0.3,
        messages: [
          {
            role: "system",
            content:
              "You are an educational content summarizer. Summarize the given topic in exactly 4-5 bullet points starting with '- '. Use simple, clear language. Only output the bullet points, nothing else.",
          },
          {
            role: "user",
            content: `Topic: "${topicName}"\n\n${text}`,
          },
        ],
      }),
      signal: controller.signal,
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("[summarize] Groq error:", JSON.stringify(data));
      return null;
    }

    const summary = data.choices?.[0]?.message?.content?.trim();
    if (!summary) {
      console.error("[summarize] Groq empty response:", JSON.stringify(data));
      return null;
    }

    return summary;
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      console.error("[summarize] Groq timed out after 20s");
    } else {
      console.error("[summarize] Groq threw:", err);
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

    if (!process.env.GROQ_API_KEY) {
      console.error("[summarize] GROQ_API_KEY missing in environment");
      return NextResponse.json(
        { error: "Server configuration error: GROQ_API_KEY not set." },
        { status: 503 }
      );
    }

    const text = content?.trim()
      ? content.trim().slice(0, 3000)
      : `Topic: ${topicName}. Provide a general educational summary.`;

    const summary = await callGroq(topicName, text);

    if (!summary) {
      return NextResponse.json(
        { error: "Failed to generate summary. Please try again." },
        { status: 500 }
      );
    }

    // Save to Supabase cache — never summarized again
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
