import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { AccountFlash } from "@/components/account/AccountFlash";
import { requireCustomer, formatDate, resolveTier, humanize } from "@/lib/account";
import { Coins, Leaf, TreeDeciduous, TreePine } from "lucide-react";

const TIER_ICON = {
  Seed: Leaf,
  Branch: TreeDeciduous,
  Root: TreePine,
  Canopy: TreePine,
} as const;

export default async function LoyaltyPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; error?: string }>;
}) {
  const { message, error } = await searchParams;
  const { supabase, user } = await requireCustomer();

  const [{ data: account }, { data: transactions }, { data: rules }] = await Promise.all([
    supabase.from("loyalty_accounts").select("*").eq("customer_id", user.id).maybeSingle(),
    supabase
      .from("loyalty_transactions")
      .select("id, type, points, reason, created_at")
      .eq("customer_id", user.id)
      .order("created_at", { ascending: false })
      .limit(25),
    supabase
      .from("loyalty_rules")
      .select("id, rule_name, trigger_event, points_awarded, multiplier")
      .eq("active", true)
      .order("points_awarded", { ascending: false }),
  ]);

  const totalEarned = account?.total_points_earned ?? 0;
  const balance = account?.current_balance ?? 0;
  const tier = resolveTier(totalEarned);
  const Icon = TIER_ICON[tier.tier];

  // Running balance is derived newest-to-oldest so each row shows what the
  // balance was immediately after that transaction.
  const history = (transactions ?? []).reduce<Array<{ id: string; date: string; activity: string; points: number; balance: number }>>(
    (rows, tx) => {
      const runningBalance = rows.length === 0 ? balance : rows[rows.length - 1].balance - rows[rows.length - 1].points;
      rows.push({
        id: tx.id,
        date: formatDate(tx.created_at),
        activity: tx.reason || humanize(tx.type),
        points: tx.points,
        balance: runningBalance,
      });
      return rows;
    },
    []
  );

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-serif text-2xl font-bold text-[#18231F]">Upside Rewards</h2>
        <p className="text-gray-500">Earn points and unlock exclusive benefits.</p>
      </div>

      <AccountFlash message={message} error={error} />

      <Card className="relative overflow-hidden border-[#18231F]/10 shadow-sm">
        <div className="pointer-events-none absolute right-0 top-0 h-32 w-32 rounded-bl-full bg-gradient-to-bl from-[#F4EFE3] to-transparent opacity-50" />
        <CardContent className="p-6">
          <div className="mb-8 flex items-start justify-between">
            <div>
              <p className="mb-1 text-sm font-medium uppercase tracking-wider text-gray-500">Current Balance</p>
              <div className="flex items-baseline gap-2">
                <h3 className="text-5xl font-bold text-[#18231F]">{balance}</h3>
                <span className="font-medium text-gray-500">pts</span>
              </div>
            </div>
            <div
              className="flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium text-white shadow-sm"
              style={{ backgroundColor: tier.color }}
            >
              <Icon className="h-4 w-4" />
              <span>{tier.tier}</span>
              <span className="ml-1 border-l border-white/30 pl-2 font-persian text-white/90">{tier.fa}</span>
            </div>
          </div>

          {tier.next && (
            <div className="space-y-3">
              <div className="flex justify-between text-sm font-medium">
                <span className="text-gray-600">Lifetime points: {totalEarned}</span>
                <span className="font-bold text-[#18231F]">
                  {tier.pointsToNext} pts to {tier.next}
                </span>
              </div>
              <Progress
                value={tier.progressPercent}
                className="h-2"
                style={{ "--progress-background": tier.color } as React.CSSProperties}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="border-[#18231F]/10 shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Points History</CardTitle>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">
                No points activity yet — your first order will start the tally.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Activity</TableHead>
                    <TableHead className="text-right">Points</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="text-gray-500">{tx.date}</TableCell>
                      <TableCell className="font-medium text-gray-900">{tx.activity}</TableCell>
                      <TableCell
                        className={`text-right font-bold ${tx.points > 0 ? "text-green-600" : "text-gray-900"}`}
                      >
                        {tx.points > 0 ? `+${tx.points}` : tx.points}
                      </TableCell>
                      <TableCell className="text-right text-gray-500">{tx.balance}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="border-[#18231F]/10 bg-[#18231F] text-white shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center text-lg text-[#F4EFE3]">
              <Coins className="mr-2 h-5 w-5 text-[#B48635]" />
              How to Earn
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(rules ?? []).length === 0 ? (
              <p className="text-sm text-white/60">
                Earning rules haven&apos;t been published yet. Check back soon.
              </p>
            ) : (
              <ul className="space-y-4">
                {(rules ?? []).map((rule) => (
                  <li
                    key={rule.id}
                    className="flex items-start justify-between border-b border-white/10 pb-4 last:border-0 last:pb-0"
                  >
                    <div>
                      <p className="font-medium text-white">{rule.rule_name}</p>
                      <p className="mt-0.5 text-xs text-white/60">{humanize(rule.trigger_event)}</p>
                    </div>
                    <span className="ml-4 inline-flex items-center whitespace-nowrap rounded bg-white/10 px-2 py-1 text-xs font-bold text-[#F4EFE3]">
                      {rule.points_awarded} pts
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
