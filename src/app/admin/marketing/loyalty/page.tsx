"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Plus, Settings2, Sparkles, Percent } from "lucide-react";

// Mock data based on the schema
const initialRules = [
  { id: 1, name: "Purchase Completed", event: "purchase_completed", points: 1, multiplier: 1.0, active: true, desc: "1 point per $1 CAD spent" },
  { id: 2, name: "Account Created", event: "account_created", points: 50, multiplier: 1.0, active: true, desc: "Welcome bonus" },
  { id: 3, name: "First Purchase", event: "first_purchase", points: 100, multiplier: 1.0, active: true, desc: "Bonus for first order" },
  { id: 4, name: "Review Submitted", event: "review_submitted", points: 30, multiplier: 1.0, active: true, desc: "One per order" },
  { id: 5, name: "Referral Signup", event: "referral_signup", points: 75, multiplier: 1.0, active: true, desc: "When friend signs up" },
  { id: 6, name: "Nowruz Campaign", event: "nowruz_campaign", points: 0, multiplier: 2.0, active: false, desc: "2x points during Nowruz" },
];

export default function AdminLoyaltyPage() {
  const [rules, setRules] = useState(initialRules);

  const toggleRule = (id: number) => {
    setRules(rules.map(r => r.id === id ? { ...r, active: !r.active } : r));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Loyalty & Rewards</h1>
          <p className="text-sm text-gray-500">Manage earning rules, campaigns, and customer tiers.</p>
        </div>
        <Button style={{ backgroundColor: "#1D4E89" }}>
          <Plus className="w-4 h-4 mr-2" />
          Add Custom Rule
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 uppercase">Total Points Issued</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">142,500</div>
            <p className="text-sm text-gray-500 mt-1">Lifetime total across all customers</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 uppercase">Points Redeemed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">45,200</div>
            <p className="text-sm text-gray-500 mt-1">~31% redemption rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 uppercase">Active Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">1</div>
            <p className="text-sm text-gray-500 mt-1">Currently boosting points</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Earning Rules</CardTitle>
          <CardDescription>Configure how customers earn points on your store.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rule Name</TableHead>
                <TableHead>Trigger Event</TableHead>
                <TableHead>Points / Multiplier</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell>
                    <p className="font-medium text-gray-900">{rule.name}</p>
                    <p className="text-xs text-gray-500">{rule.desc}</p>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">{rule.event}</code>
                  </TableCell>
                  <TableCell>
                    {rule.multiplier > 1.0 ? (
                      <span className="inline-flex items-center text-[#B48635] font-bold">
                        <Percent className="w-3 h-3 mr-1" />
                        {rule.multiplier}x Multiplier
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-gray-900 font-medium">
                        <Sparkles className="w-3 h-3 mr-1 text-[#1F8A8A]" />
                        {rule.points} pts
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Switch 
                      checked={rule.active} 
                      onCheckedChange={() => toggleRule(rule.id)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="text-gray-500">
                      <Settings2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
