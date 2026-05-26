import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { ok, validationError, serverError, serviceUnavailable } from "../../lib/apiResponse";

export const maxDuration = 30;

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Bullets: structured key facts per level
// Paragraph: flowing TL;DR sentence summary per level
const SYSTEM_PROMPTS: Record<string, Record<string, string>> = {
  bullets: {
    professional:
      "You are an educational content summarizer. Summarize the given topic in exactly 4-5 bullet points starting with '- '. Use formal, professional language with precise technical terminology. Only output the bullet points, nothing else.",
    simple:
      "You are an educational content summarizer. Summarize the given topic in exactly 4-5 bullet points starting with '- '. Use simple, everyday language that a high school student can easily understand. Avoid technical jargon. Only output the bullet points, nothing else.",
    basic:
      "You are an educational content summarizer. Summarize the given topic in exactly 4-5 bullet points starting with '- '. Use very basic language as if explaining to a 12-year-old. Use very short sentences and only common everyday words. Only output the bullet points, nothing else.",
  },
  paragraph: {
    professional:
      "You are an educational content summarizer. Write a concise 2-3 sentence TL;DR paragraph summarizing the given topic. Use formal, professional language with precise technical terminology. Do not use bullet points or lists. Output only the paragraph.",
    simple:
      "You are an educational content summarizer. Write a concise 2-3 sentence summary paragraph of the given topic. Use simple, friendly language that a high school student can easily understand. Do not use bullet points or lists. Output only the paragraph.",
    basic:
      "You are an educational content summarizer. Write 2-3 very short, easy sentences explaining the given topic as if talking to a 12-year-old. Use only common everyday words. Do not use bullet points or lists. Output only the sentences.",
  },
};

async function callGroq(
  topicName: string,
  text: string,
  level: string,
  format: string
): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const systemPrompt =
      SYSTEM_PROMPTS[format]?.[level] ?? SYSTEM_PROMPTS.bullets.professional;

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
          { role: "system", content: systemPrompt },
          { role: "user", content: `Topic: "${topicName}"\n\n${text}` },
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
    const {
      topicId,
      topicName,
      content,
      level = "professional",
      format = "bullets",
    } = await req.json();

    if (!topicId) {
      return validationError("topicId is required");
    }

    // Each level + format combination is cached separately
    const cacheKey =
      format === "paragraph"
        ? `${topicId}_${level}_paragraph`
        : `${topicId}_${level}`;

    const { data: cached } = await supabaseAdmin
      .from("topic_summaries")
      .select("summary")
      .eq("topic_id", cacheKey)
      .maybeSingle();

    if (cached?.summary) {
      return ok({ summary: cached.summary, cached: true }, "Summary ready");
    }

    if (!process.env.GROQ_API_KEY) {
      console.error("[summarize] GROQ_API_KEY missing in environment");
      return serviceUnavailable("AI service is not configured");
    }

    const text = content?.trim()
      ? content.trim().slice(0, 3000)
      : `Topic: ${topicName}. Provide a general educational summary.`;

    const summary = await callGroq(topicName, text, level, format);

    if (!summary) {
      return serverError("Failed to generate summary. Please try again.");
    }

    await supabaseAdmin
      .from("topic_summaries")
      .upsert(
        { topic_id: cacheKey, summary },
        { onConflict: "topic_id", ignoreDuplicates: true }
      );

    return ok({ summary, cached: false }, "Summary ready");
  } catch (err) {
    console.error("[summarize] Unexpected error:", err);
    return serverError("Unexpected server error");
  }
}
