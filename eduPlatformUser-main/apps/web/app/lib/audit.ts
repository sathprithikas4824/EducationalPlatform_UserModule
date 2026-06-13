import { supabase } from "./supabase";

export type AuditCategory =
  | "auth"
  | "profile"
  | "content"
  | "highlight"
  | "bookmark"
  | "note"
  | "summary"
  | "download"
  | "comment"
  | "admin";

export interface AuditEvent {
  action: string;
  category: AuditCategory;
  entity_type?: string;
  entity_id?: string;
  metadata?: Record<string, unknown>;
  status?: "success" | "failure" | "partial";
  error_msg?: string;
}

function getOrCreateSessionId(): string {
  const key = "edu_session_id";
  let sid = sessionStorage.getItem(key);
  if (!sid) {
    sid = crypto.randomUUID();
    sessionStorage.setItem(key, sid);
  }
  return sid;
}

export async function logAudit(event: AuditEvent): Promise<void> {
  if (!supabase) return;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const sessionId = getOrCreateSessionId();

    await supabase.from("user_audit_logs").insert({
      user_id:     user.id,
      session_id:  sessionId,
      action:      event.action,
      category:    event.category,
      entity_type: event.entity_type ?? null,
      entity_id:   event.entity_id   ?? null,
      metadata:    event.metadata    ?? {},
      user_agent:  navigator.userAgent,
      status:      event.status      ?? "success",
      error_msg:   event.error_msg   ?? null,
    });
  } catch {
    // Audit logging must never break the app
  }
}
