import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sparkles, Percent } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { LoyaltyRuleSwitch } from "./LoyaltyRuleSwitch";

type LoyaltyRule = {
  id: string;
  rule_name: string;
  trigger_event: string;
  points_awarded: number;
  multiplier: number | string | null;
  active: boolean | null;
};

export default async function AdminLoyaltyPage() {
  const supabase = await createClient();

  // Point totals are summed here rather than in SQL: PostgREST aggregates
  // are disabled by default, and the ledger is small at this stage. Move to
  // an RPC once loyalty_transactions grows into the tens of thousands.
  const [{ data: ruleRows, error: rulesError }, { data: ledger }, { count: memberCount }] = await Promise.all([
    supabase
      .from("loyalty_rules")
      .select("id, rule_name, trigger_event, points_awarded, multiplier, active")
      .order("created_at", { ascending: true }),
    supabase.from("loyalty_transactions").select("type, points"),
    supabase.from("loyalty_accounts").select("id", { count: "exact", head: true }),
  ]);

  const rules = (ruleRows ?? []) as LoyaltyRule[];
  const transactions = (ledger ?? []) as Array<{ type: string; points: number }>;
  const issued = transactions.filter((t) => t.points > 0).reduce((sum, t) => sum + t.points, 0);
  const redeemed = transactions
    .filter((t) => t.type === "redeem")
    .reduce((sum, t) => sum + Math.abs(t.points), 0);
  const redemptionRate = issued > 0 ? Math.round((redeemed / issued) * 100) : null;
  const activeMultipliers = rules.filter((r) => r.active && Number(r.multiplier) > 1).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Loyalty & Rewards</h1>
        <p className="text-sm text-gray-500">Earning rules and points issued across the store.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 uppercase">Points Issued</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{issued.toLocaleString()}</div>
            <p className="text-sm text-gray-500 mt-1">
              Lifetime, across {(memberCount ?? 0).toLocaleString()} member{memberCount === 1 ? "" : "s"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 uppercase">Points Redeemed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{redeemed.toLocaleString()}</div>
            <p className="text-sm text-gray-500 mt-1">
              {redemptionRate === null ? "Nothing issued yet" : `${redemptionRate}% redemption rate`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 uppercase">Active Multipliers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{activeMultipliers}</div>
            <p className="text-sm text-gray-500 mt-1">Rules currently boosting points</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Earning Rules</CardTitle>
          <CardDescription>Turn rules on or off. Changes apply to new activity only.</CardDescription>
        </CardHeader>
        <CardContent>
          {rulesError && (
            <p className="mb-4 text-sm text-red-600">Couldn&apos;t load rules: {rulesError.message}</p>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rule Name</TableHead>
                <TableHead>Trigger Event</TableHead>
                <TableHead>Points / Multiplier</TableHead>
                <TableHead>Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-gray-500">
                    No loyalty rules defined.
                  </TableCell>
                </TableRow>
              ) : (
                rules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell className="font-medium text-gray-900">{rule.rule_name}</TableCell>
                    <TableCell>
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">{rule.trigger_event}</code>
                    </TableCell>
                    <TableCell>
                      {Number(rule.multiplier) > 1 ? (
                        <span className="inline-flex items-center text-gold-600 font-bold">
                          <Percent className="w-3 h-3 mr-1" />
                          {Number(rule.multiplier)}x Multiplier
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-gray-900 font-medium">
                          <Sparkles className="w-3 h-3 mr-1 text-turquoise-500" />
                          {rule.points_awarded} pts
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <LoyaltyRuleSwitch ruleId={rule.id} active={Boolean(rule.active)} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
