import { createClient } from "@supabase/supabase-js";
import { hashIp, maskEmail, scrubMetadata } from "./hash";

// We use the service role key for logging to bypass RLS,
// as clients should never write to these tables directly.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

export type AuditLogPayload = {
  admin_user_id?: string | null;
  admin_email?: string | null;
  admin_role?: string | null;
  action_type: string;
  action_category: string;
  target_table?: string | null;
  target_id?: string | null;
  target_label?: string | null;
  old_value?: any | null;
  new_value?: any | null;
  ip_address?: string | null;
  user_agent?: string | null;
  session_id?: string | null;
};

/**
 * Server-side middleware to capture admin actions.
 * Never blocks business logic.
 */
export async function auditLog(payload: AuditLogPayload) {
  try {
    // Fire and forget
    supabaseAdmin.from("admin_audit_logs").insert([{
      ...payload,
      admin_email: maskEmail(payload.admin_email),
      old_value: scrubMetadata(payload.old_value),
      new_value: scrubMetadata(payload.new_value),
      ip_address: hashIp(payload.ip_address)
    }]).then(({ error }) => {
      if (error) console.error("Failed to write audit log", error);
    });
  } catch (error) {
    console.error("Critical failure in audit logger", error);
  }
}

export type SystemEventPayload = {
  service: string;
  event_type: string;
  severity: "info" | "warning" | "error" | "critical";
  status: "success" | "failed" | "pending" | "retrying";
  trigger_source?: string | null;
  related_order_id?: string | null;
  related_customer_id?: string | null;
  related_product_id?: string | null;
  request_payload?: any | null;
  response_payload?: any | null;
  error_code?: string | null;
  error_message?: string | null;
  duration_ms?: number | null;
};

/**
 * Server-side system logger for wrapping APIs, cron jobs, etc.
 */
export async function systemLog(payload: SystemEventPayload) {
  try {
    supabaseAdmin.from("system_event_logs").insert([{
      ...payload,
      request_payload: scrubMetadata(payload.request_payload),
      response_payload: scrubMetadata(payload.response_payload),
    }]).then(({ error }) => {
      if (error) console.error("Failed to write system log", error);
    });
  } catch (error) {
    console.error("Critical failure in system logger", error);
  }
}

export type UserActivityPayload = {
  session_id: string;
  customer_id?: string | null;
  event_type: string;
  event_category: string;
  page_url?: string;
  referrer_url?: string;
  device_type?: string;
  browser?: string;
  os?: string;
  ip_address?: string;
  country?: string;
  region?: string;
  metadata?: any;
};

/**
 * Inserts batched user activity events from the frontend
 */
export async function insertUserActivities(activities: UserActivityPayload[]) {
  try {
    const scrubbedActivities = activities.map(a => ({
      ...a,
      ip_address: hashIp(a.ip_address),
      metadata: scrubMetadata(a.metadata)
    }));

    await supabaseAdmin.from("user_activity_logs").insert(scrubbedActivities);
  } catch (error) {
    console.error("Failed to insert user activities", error);
  }
}
