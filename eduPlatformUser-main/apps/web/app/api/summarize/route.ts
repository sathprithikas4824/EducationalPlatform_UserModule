import { NextRequest } from "next/server";
import { ok, validationError, serverError, serviceUnavailable } from "../../lib/apiResponse";
import { logger } from "../../lib/logger";

export const maxDuration = 30;

const ROUTE = "/api/summarize";

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
): Promise<{ summary: string | null; durationMs: number }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  const start = Date.now();

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
    const durationMs = Date.now() - start;

    if (!res.ok) {
      return { summary: null, durationMs };
    }

    const summary = data.choices?.[0]?.message?.content?.trim() || null;
    return { summary, durationMs };
  } catch (err: unknown) {
    return { summary: null, durationMs: Date.now() - start };
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(req: NextRequest) {
  let topicId: unknown, topicName: unknown, content: unknown,
      level = "professional", format = "bullets", userId = "anonymous";

  try {
    const body = await req.json();
    topicId   = body.topicId;
    topicName = body.topicName;
    content   = body.content;
    level     = body.level   ?? "professional";
    format    = body.format  ?? "bullets";
    userId    = body.userId  ?? "anonymous";
  } catch {
    return serverError("Invalid JSON in request body");
  }

  if (!topicId) {
    logger.warn(ROUTE, "generate_summary", userId, "Validation failed: topicId missing");
    return validationError("topicId is required");
  }

  if (!process.env.GROQ_API_KEY) {
    logger.error(ROUTE, "generate_summary", userId, "GROQ_API_KEY not set in environment");
    return serviceUnavailable("AI service is not configured");
  }

  const text = (content as string)?.trim()
    ? (content as string).trim().slice(0, 3000)
    : `Topic: ${topicName}. Provide a general educational summary.`;

  const { summary, durationMs } = await callGroq(topicName as string, text, level, format);

  if (!summary) {
    logger.error(ROUTE, "generate_summary", userId, "Groq failed to return summary", undefined, {
      payload: { topicId: topicId as string, level, format },
      durationMs,
    });
    return serverError("Failed to generate summary. Please try again.");
  }

  logger.info(ROUTE, "generate_summary", userId, "Summary generated successfully", {
    topicId: topicId as string, topicName: topicName as string, level, format, durationMs,
  });

  return ok({ summary, cached: false }, "Summary ready");
}
