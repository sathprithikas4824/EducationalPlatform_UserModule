// Structured logger — one JSON line per event, searchable in Vercel logs.
// Usage: logger.info(route, action, userId, msg, payload?)
//        logger.warn(route, action, userId, msg, err?)
//        logger.error(route, action, userId, msg, err?)

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

function write(entry: LogEntry): void {
  const line = JSON.stringify(entry);
  if (entry.level === "ERROR") console.error(line);
  else if (entry.level === "WARN")  console.warn(line);
  else                              console.log(line);
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
      err: extra.err instanceof Error ? extra.err.message : String(extra.err),
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
