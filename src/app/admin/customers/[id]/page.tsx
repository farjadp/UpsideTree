"use client";

import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, User, Mail, MapPin, Gift, TreePine } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function SingleCustomerPage() {
  const params = useParams();
  
  // Mock data for this customer
  const customer = {
    id: params.id,
    name: "Farjad Gholami",
    email: "farjad@example.com",
    location: "Toronto, ON",
    totalSpent: 450.00,
    loyalty: {
      tier: "Root",
      tier_fa: "ریشه",
      color: "#1D4E89",
      balance: 340,
      lifetime: 1250
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/admin/customers">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">{customer.name}</h1>
            <p className="text-sm text-gray-500">Customer ID: {customer.id}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Customer Details */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Customer Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center text-gray-700">
              <Mail className="w-4 h-4 mr-3 text-gray-400" />
              {customer.email}
            </div>
            <div className="flex items-center text-gray-700">
              <MapPin className="w-4 h-4 mr-3 text-gray-400" />
              {customer.location}
            </div>
            <div className="pt-4 mt-4 border-t border-gray-100 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">Total Spent</span>
              <span className="text-lg font-bold text-gray-900">${customer.totalSpent.toFixed(2)} CAD</span>
            </div>
          </CardContent>
        </Card>

        {/* Loyalty View as requested */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center">
              <Gift className="w-5 h-5 mr-2 text-[#B48635]" />
              Loyalty Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Current Tier</p>
              <div 
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-white text-sm font-medium shadow-sm"
                style={{ backgroundColor: customer.loyalty.color }}
              >
                <TreePine className="w-4 h-4" />
                <span>{customer.loyalty.tier}</span>
                <span className="border-l pl-2 ml-1 border-white/30 text-white/90 font-persian">{customer.loyalty.tier_fa}</span>
              </div>
            </div>

            <div className="space-y-3 pt-3 border-t border-gray-100">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Current Balance</span>
                <span className="font-bold text-[#18231F]">{customer.loyalty.balance} pts</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Total Earned (Lifetime)</span>
                <span className="font-medium text-gray-700">{customer.loyalty.lifetime} pts</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
