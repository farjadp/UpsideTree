import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Activity, ShieldAlert, Users, Server } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { formatDateTime } from "@/lib/account";

const PAGE_SIZE = 50;

const SEVERITY_STYLES: Record<string, string> = {
  info: "bg-slate-50 text-slate-700",
  warning: "bg-amber-50 text-amber-700",
  error: "bg-red-50 text-red-700",
  critical: "bg-red-100 text-red-800",
};

const STATUS_STYLES: Record<string, string> = {
  success: "bg-emerald-50 text-emerald-700",
  failed: "bg-red-50 text-red-700",
  pending: "bg-amber-50 text-amber-700",
  retrying: "bg-amber-50 text-amber-700",
};

function EmptyRow({ colSpan, error }: { colSpan: number; error?: string }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className={`py-10 text-center text-sm ${error ? "text-red-600" : "text-gray-500"}`}>
        {error ? `Couldn't load logs: ${error}` : "Nothing logged yet."}
      </TableCell>
    </TableRow>
  );
}

function Footnote({ shown, total }: { shown: number; total: number | null }) {
  if (!total) return null;
  return (
    <div className="p-4 border-t border-gray-100 text-center text-xs text-gray-400">
      Showing the latest {shown.toLocaleString()} of {total.toLocaleString()} records.
    </div>
  );
}

const DAY_MS = 24 * 60 * 60 * 1000;

function countRecentCritical(rows: Array<{ severity: string; created_at: string }>) {
  const cutoff = Date.now() - DAY_MS;
  return rows.filter((row) => row.severity === "critical" && new Date(row.created_at).getTime() > cutoff).length;
}

export default async function LogsDashboard() {
  const supabase = await createClient();
  const latest = { ascending: false } as const;

  const [activity, audit, system, security] = await Promise.all([
    supabase
      .from("user_activity_logs")
      .select("id, created_at, customer_id, session_id, event_type, page_url, device_type, browser, country, region", { count: "exact" })
      .order("created_at", latest)
      .limit(PAGE_SIZE),
    supabase
      .from("admin_audit_logs")
      .select("id, created_at, admin_email, action_type, target_table, target_label", { count: "exact" })
      .order("created_at", latest)
      .limit(PAGE_SIZE),
    supabase
      .from("system_event_logs")
      .select("id, created_at, service, event_type, severity, status, duration_ms, error_message", { count: "exact" })
      .order("created_at", latest)
      .limit(PAGE_SIZE),
    supabase
      .from("security_logs")
      .select("id, created_at, actor_type, actor_email, event_type, severity, ip_address, blocked, success", { count: "exact" })
      .order("created_at", latest)
      .limit(PAGE_SIZE),
  ]);

  const recentCriticalSecurity = countRecentCritical(security.data ?? []);

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">System Logs</h1>
        <p className="text-sm text-gray-500">Audit trail of customer, admin, system and security activity.</p>
      </div>

      <Tabs defaultValue="system" className="w-full">
        <TabsList className="grid w-full grid-cols-4 max-w-2xl">
          <TabsTrigger value="system" className="flex items-center gap-2">
            <Server className="w-4 h-4" />
            <span className="hidden sm:inline">System Events</span>
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">User Activity</span>
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            <span className="hidden sm:inline">Admin Audit</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2 relative">
            <ShieldAlert className="w-4 h-4" />
            <span className="hidden sm:inline">Security</span>
            {recentCriticalSecurity > 0 && (
              <span className="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-red-500" />
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="system" className="mt-6">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!system.data?.length ? (
                  <EmptyRow colSpan={5} error={system.error?.message} />
                ) : (
                  system.data.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="text-gray-500 text-xs whitespace-nowrap">{formatDateTime(row.created_at)}</TableCell>
                      <TableCell className="font-medium text-sm">{row.service}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{row.event_type}</Badge>
                        {row.error_message && (
                          <p className="mt-1 max-w-md truncate text-xs text-red-600" title={row.error_message}>
                            {row.error_message}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={STATUS_STYLES[row.status] ?? ""}>{row.status}</Badge>
                      </TableCell>
                      <TableCell className="text-gray-500 text-sm">
                        {row.duration_ms != null ? `${row.duration_ms}ms` : "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <Footnote shown={system.data?.length ?? 0} total={system.count} />
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="mt-6">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Visitor</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Page</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead>Location</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!activity.data?.length ? (
                  <EmptyRow colSpan={6} error={activity.error?.message} />
                ) : (
                  activity.data.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="text-gray-500 text-xs whitespace-nowrap">{formatDateTime(row.created_at)}</TableCell>
                      <TableCell className="font-mono text-xs text-gray-600">
                        {row.customer_id ? `customer ${String(row.customer_id).slice(0, 8)}` : `anon ${String(row.session_id ?? "").slice(0, 8)}`}
                      </TableCell>
                      <TableCell><Badge variant="outline">{row.event_type}</Badge></TableCell>
                      <TableCell className="text-gray-500 text-sm truncate max-w-[200px]">{row.page_url ?? "—"}</TableCell>
                      <TableCell className="text-gray-500 text-sm">
                        {[row.device_type, row.browser].filter(Boolean).join(" · ") || "—"}
                      </TableCell>
                      <TableCell className="text-gray-500 text-sm">
                        {[row.country, row.region].filter(Boolean).join(" ") || "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <Footnote shown={activity.data?.length ?? 0} total={activity.count} />
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="mt-6">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Target</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!audit.data?.length ? (
                  <EmptyRow colSpan={4} error={audit.error?.message} />
                ) : (
                  audit.data.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="text-gray-500 text-xs whitespace-nowrap">{formatDateTime(row.created_at)}</TableCell>
                      <TableCell className="font-medium text-sm">{row.admin_email ?? "—"}</TableCell>
                      <TableCell><Badge variant="outline">{row.action_type}</Badge></TableCell>
                      <TableCell className="text-sm">
                        {[row.target_table, row.target_label].filter(Boolean).join(": ") || "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <Footnote shown={audit.data?.length ?? 0} total={audit.count} />
          </Card>
        </TabsContent>

        <TabsContent value="security" className="mt-6">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>IP (hashed)</TableHead>
                  <TableHead>Outcome</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!security.data?.length ? (
                  <EmptyRow colSpan={6} error={security.error?.message} />
                ) : (
                  security.data.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="text-gray-500 text-xs whitespace-nowrap">{formatDateTime(row.created_at)}</TableCell>
                      <TableCell className="font-medium text-sm">{row.actor_email ?? row.actor_type}</TableCell>
                      <TableCell><Badge variant="outline">{row.event_type}</Badge></TableCell>
                      <TableCell>
                        <Badge variant="outline" className={SEVERITY_STYLES[row.severity] ?? ""}>{row.severity}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-gray-500">
                        {row.ip_address ? `${String(row.ip_address).slice(0, 16)}…` : "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {row.blocked ? "Blocked" : row.success === false ? "Failed" : row.success ? "OK" : "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <Footnote shown={security.data?.length ?? 0} total={security.count} />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
