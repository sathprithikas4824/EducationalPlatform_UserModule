// Structured logger — JSON per event to console (Vercel logs) + Kafka topic.
// Usage: logger.info(route, action, userId, msg, payload?)
//        logger.warn(route, action, userId, msg, err?)
//        logger.error(route, action, userId, msg, err?)

import type { Producer } from "kafkajs";
import { waitUntil } from "@vercel/functions";

type Level = "INFO" | "WARN" | "ERROR";

interface LogEntry {
  ts:          string;
  level:       Level;
  route:       string;
  action:      string;
  userId:      string;
  msg:         string;
  payload?:    Record<string, unknown>;
  err?:        string;
  durationMs?: number;
}

// --- Kafka producer (cached per warm Lambda, skipped in Edge runtime) ---
let _producer: Producer | null = null;
let _connecting = false;

async function getProducer(): Promise<Producer | null> {
  // kafkajs uses native Node.js TCP/TLS — crashes Turbopack (dev mode) on Windows.
  // Console logs are sufficient locally; Kafka only runs in production (Vercel/webpack).
  if (process.env.NODE_ENV !== "production") return null;

  const brokers   = process.env.KAFKA_BROKERS;
  const username  = process.env.KAFKA_USERNAME;
  const password  = process.env.KAFKA_PASSWORD;
  if (!brokers || !username || !password) return null;
  if (_producer)    return _producer;
  if (_connecting)  return null;

  _connecting = true;
  try {
    // Dynamic import — throws in Edge runtime (V8 isolates lack Node TCP), handled below
    const { Kafka } = await import("kafkajs");
    const kafka = new Kafka({
      clientId: "edu-platform",
      brokers:  brokers.split(",").map((b) => b.trim()),
      ssl:      true,
      sasl:     { mechanism: "scram-sha-256", username, password },
      logLevel: 0,
    });
    _producer = kafka.producer();
    await _producer.connect();
    _connecting = false;
    return _producer;
  } catch (err) {
    _connecting = false;
    console.error("[kafka] Producer connection failed:", err instanceof Error ? err.message : String(err));
    return null;
  }
}

function sendToKafka(entry: LogEntry): void {
  const topic = process.env.KAFKA_TOPIC ?? "eduplatform_logs";
  const promise = getProducer()
    .then((producer) => {
      if (!producer) return;
      return producer.send({ topic, messages: [{ value: JSON.stringify(entry) }] });
    })
    .catch(() => {});
  // waitUntil keeps the Vercel function alive until Kafka send completes
  // without delaying the HTTP response back to the user
  waitUntil(promise);
}
// -------------------------------------------------------------------------

function write(entry: LogEntry): void {
  const line = JSON.stringify(entry);
  if (entry.level === "ERROR") console.error(line);
  else if (entry.level === "WARN")  console.warn(line);
  else                              console.log(line);
  sendToKafka(entry);
}

function build(
  level:   Level,
  route:   string,
  action:  string,
  userId:  string,
  msg:     string,
  extra?:  { payload?: Record<string, unknown>; err?: unknown; durationMs?: number }
): LogEntry {
  return {
    ts:          new Date().toISOString(),
    level,
    route,
    action,
    userId:      userId || "anonymous",
    msg,
    ...(extra?.payload    && { payload:    extra.payload }),
    ...(extra?.err        !== undefined && {
      err: extra.err instanceof Error
        ? extra.err.message
        : typeof extra.err === "object"
          ? JSON.stringify(extra.err)
          : String(extra.err),
    }),
    ...(extra?.durationMs !== undefined && { durationMs: extra.durationMs }),
  };
}

export const logger = {
  info(
    route:   string,
    action:  string,
    userId:  string,
    msg:     string,
    payload?: Record<string, unknown>
  ): void {
    write(build("INFO", route, action, userId, msg, { payload }));
  },

  warn(
    route:   string,
    action:  string,
    userId:  string,
    msg:     string,
    err?:    unknown,
    payload?: Record<string, unknown>
  ): void {
    write(build("WARN", route, action, userId, msg, { err, payload }));
  },

  error(
    route:   string,
    action:  string,
    userId:  string,
    msg:     string,
    err?:    unknown,
    extra?:  { payload?: Record<string, unknown>; durationMs?: number }
  ): void {
    write(build("ERROR", route, action, userId, msg, { err, ...extra }));
  },
};

// Masks email for safe logging — a***@gmail.com
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  return `${local[0] ?? ""}***@${domain}`;
}
