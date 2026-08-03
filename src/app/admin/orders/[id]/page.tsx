"use client";

import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Package, Truck, ExternalLink } from "lucide-react";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";
import { use } from "react";

export default function OrderDetailsPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/admin/orders">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">Order {params.id}</h1>
              <Badge variant="secondary" className="bg-amber-100 text-amber-800">Unfulfilled</Badge>
            </div>
            <p className="text-sm text-gray-500">Placed on August 1, 2026 at 10:23 AM</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">Cancel Order</Button>
          <Button style={{ backgroundColor: "#1D4E89" }}>
            Fulfill Order
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Order Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between py-4 border-b border-gray-100">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gray-100 rounded-md border border-gray-200"></div>
                  <div>
                    <h3 className="font-medium text-gray-900">Classic Tree Print</h3>
                    <p className="text-sm text-gray-500">Size: 18x24, Frame: Black</p>
                    <p className="text-sm text-gray-500">SKU: PRT-TREE-1824-BLK</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">{formatPrice(45)}</p>
                  <p className="text-sm text-gray-500">Qty: 1</p>
                </div>
              </div>
              <div className="flex items-center justify-between py-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gray-100 rounded-md border border-gray-200"></div>
                  <div>
                    <h3 className="font-medium text-gray-900">Forest Canopy Tote</h3>
                    <p className="text-sm text-gray-500">SKU: TOT-CAN-001</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">{formatPrice(30)}</p>
                  <p className="text-sm text-gray-500">Qty: 2</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>{formatPrice(105)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Shipping (Standard)</span>
                  <span>{formatPrice(15)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Tax (HST 13%)</span>
                  <span>{formatPrice(15.60)}</span>
                </div>
                <div className="flex justify-between font-bold text-gray-900 pt-4 border-t border-gray-100">
                  <span>Total</span>
                  <span>{formatPrice(120.60)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Customer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <p className="font-medium text-gray-900">Sarah Jenkins</p>
                <p className="text-gray-500 text-blue-600 hover:underline cursor-pointer">sarah.j@example.com</p>
                <p className="text-gray-500">12 orders</p>
              </div>
              <div className="pt-4 border-t border-gray-100">
                <p className="font-medium text-gray-900 mb-1">Shipping Address</p>
                <p className="text-gray-500">
                  123 Maple Street<br />
                  Apt 4B<br />
                  Toronto, ON M4B 1B3<br />
                  Canada
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                Printful Fulfillment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gray-50 p-3 rounded-md text-sm">
                <p className="font-medium text-gray-900 mb-1">Status: Pending</p>
                <p className="text-gray-500 mb-3">Order will be sent to Printful when fulfilled.</p>
                <Button variant="outline" size="sm" className="w-full">
                  Send to Printful Now
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
