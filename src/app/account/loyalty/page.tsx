"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Gift, Copy, Leaf, TreeDeciduous, TreePine, Coins, Share2 } from "lucide-react";

// Mock data for UI demonstration
const loyaltyData = {
  total_points_earned: 1250,
  current_balance: 340,
  tier: "Root",
  tier_fa: "ریشه",
};

const history = [
  { id: 1, date: "2026-08-01", activity: "Purchase #1042", points: "+120", balance: 340 },
  { id: 2, date: "2026-07-15", activity: "Redeemed Reward", points: "-500", balance: 220 },
  { id: 3, date: "2026-06-22", activity: "Review submitted", points: "+30", balance: 720 },
  { id: 4, date: "2026-06-20", activity: "Purchase #1015", points: "+690", balance: 690 },
];

const earningRules = [
  { id: 1, name: "Make a purchase", desc: "1 point per $1 CAD spent", points: "Variable" },
  { id: 2, name: "Leave a review", desc: "Write a review after purchasing", points: "30 pts" },
  { id: 3, name: "Refer a friend", desc: "When they make their first purchase", points: "150 pts" },
  { id: 4, name: "Complete a Collection", desc: "Buy all items in a specific collection", points: "200 pts" },
];

export default function LoyaltyPage() {
  const getTierDetails = (tier: string) => {
    switch (tier) {
      case "Seed": return { color: "#697A4D", icon: Leaf, next: "Branch", target: 300 };
      case "Branch": return { color: "#1F8A8A", icon: TreeDeciduous, next: "Root", target: 1000 };
      case "Root": return { color: "#1D4E89", icon: TreePine, next: "Canopy", target: 3000 };
      case "Canopy": return { color: "#B48635", icon: TreePine, next: "Max", target: 3000 };
      default: return { color: "#697A4D", icon: Leaf, next: "Branch", target: 300 };
    }
  };

  const tierDetails = getTierDetails(loyaltyData.tier);
  const Icon = tierDetails.icon;
  const progressPercent = Math.min(100, (loyaltyData.total_points_earned / tierDetails.target) * 100);
  const pointsToNext = Math.max(0, tierDetails.target - loyaltyData.total_points_earned);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-serif font-bold text-[#18231F]">Upside Rewards</h2>
        <p className="text-gray-500">Earn points and unlock exclusive benefits.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Balance Card */}
        <Card className="border-[#18231F]/10 shadow-sm overflow-hidden relative">
          <div className="absolute right-0 top-0 w-32 h-32 bg-gradient-to-bl from-[#F4EFE3] to-transparent rounded-bl-full opacity-50 pointer-events-none" />
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-8">
              <div>
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-1">Current Balance</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-5xl font-bold text-[#18231F]">{loyaltyData.current_balance}</h3>
                  <span className="text-gray-500 font-medium">pts</span>
                </div>
              </div>
              <div 
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-white text-sm font-medium shadow-sm"
                style={{ backgroundColor: tierDetails.color }}
              >
                <Icon className="w-4 h-4" />
                <span>{loyaltyData.tier}</span>
                <span className="border-l pl-2 ml-1 border-white/30 text-white/90 font-persian">{loyaltyData.tier_fa}</span>
              </div>
            </div>

            {loyaltyData.tier !== "Canopy" && (
              <div className="space-y-3">
                <div className="flex justify-between text-sm font-medium">
                  <span className="text-gray-600">Lifetime Points: {loyaltyData.total_points_earned}</span>
                  <span className="text-[#18231F] font-bold">{pointsToNext} pts to {tierDetails.next}</span>
                </div>
                <Progress value={progressPercent} className="h-2" style={{ "--progress-background": tierDetails.color } as React.CSSProperties} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Referrals Card */}
        <Card className="border-[#18231F]/10 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center text-lg">
              <Share2 className="w-5 h-5 mr-2 text-[#1D4E89]" />
              Refer a Friend <span className="font-persian font-normal text-gray-400 ml-2">معرفی به دوستان</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">Give your friends 10% off their first order and get 150 points when they buy.</p>
            <div className="flex gap-2">
              <Input value="https://upsidetree.ca/ref/FARJAD99" readOnly className="bg-gray-50 font-mono text-sm text-gray-600" />
              <Button variant="outline" size="icon" className="shrink-0 text-[#18231F] border-[#18231F]/20 hover:bg-[#F4EFE3]">
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex gap-6 mt-4 pt-4 border-t border-gray-100">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Referrals</p>
                <p className="text-xl font-bold text-[#18231F]">3</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Earned</p>
                <p className="text-xl font-bold text-[#18231F]">450 <span className="text-sm font-normal text-gray-500">pts</span></p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* History Table */}
        <Card className="lg:col-span-2 border-[#18231F]/10 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Points History</CardTitle>
          </CardHeader>
          <CardContent>
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
                    <TableCell className={`text-right font-bold ${tx.points.startsWith("+") ? "text-green-600" : "text-gray-900"}`}>
                      {tx.points}
                    </TableCell>
                    <TableCell className="text-right text-gray-500">{tx.balance}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* How to Earn */}
        <Card className="border-[#18231F]/10 shadow-sm bg-[#18231F] text-white">
          <CardHeader>
            <CardTitle className="text-lg flex items-center text-[#F4EFE3]">
              <Coins className="w-5 h-5 mr-2 text-[#B48635]" />
              How to Earn
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              {earningRules.map((rule) => (
                <li key={rule.id} className="flex justify-between items-start pb-4 border-b border-white/10 last:border-0 last:pb-0">
                  <div>
                    <p className="font-medium text-white">{rule.name}</p>
                    <p className="text-xs text-white/60 mt-0.5">{rule.desc}</p>
                  </div>
                  <span className="inline-flex items-center px-2 py-1 rounded bg-white/10 text-[#F4EFE3] text-xs font-bold whitespace-nowrap ml-4">
                    {rule.points}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
