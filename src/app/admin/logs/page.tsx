"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Activity, ShieldAlert, Users, Server, Search, Download, RefreshCw } from "lucide-react";

export default function LogsDashboard() {
  const [isLive, setIsLive] = useState(false);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">System Logs</h1>
          <p className="text-sm text-gray-500">Comprehensive audit trail of all platform activity.</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className={isLive ? "bg-green-50 text-green-700 border-green-200" : ""}
            onClick={() => setIsLive(!isLive)}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLive ? "animate-spin" : ""}`} />
            {isLive ? "Live Mode ON" : "Live Mode OFF"}
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      <Tabs defaultValue="activity" className="w-full">
        <TabsList className="grid w-full grid-cols-4 max-w-2xl">
          <TabsTrigger value="activity" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">User Activity</span>
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            <span className="hidden sm:inline">Admin Audit</span>
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-2">
            <Server className="w-4 h-4" />
            <span className="hidden sm:inline">System Events</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2 relative">
            <ShieldAlert className="w-4 h-4" />
            <span className="hidden sm:inline">Security</span>
            <span className="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-red-500" />
          </TabsTrigger>
        </TabsList>

        <div className="flex items-center gap-4 mt-6 mb-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input placeholder="Search logs, metadata, or IPs..." className="pl-9" />
          </div>
          <Button variant="outline">Filter</Button>
        </div>

        {/* Tab 1: User Activity */}
        <TabsContent value="activity">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Page</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead>Location</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Mock Row */}
                <TableRow>
                  <TableCell className="text-gray-500 text-xs">2026-08-01 17:42:10</TableCell>
                  <TableCell className="font-medium text-sm">Anon (session-xyz)</TableCell>
                  <TableCell><Badge variant="outline" className="bg-blue-50 text-blue-700">page_viewed</Badge></TableCell>
                  <TableCell className="text-gray-500 text-sm truncate max-w-[200px]">/collections/all</TableCell>
                  <TableCell className="text-gray-500 text-sm">Mobile (Safari)</TableCell>
                  <TableCell className="text-gray-500 text-sm">CA (ON)</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-gray-500 text-xs">2026-08-01 17:41:05</TableCell>
                  <TableCell className="font-medium text-sm">Farjad Gholami</TableCell>
                  <TableCell><Badge variant="outline" className="bg-green-50 text-green-700">product_added_to_cart</Badge></TableCell>
                  <TableCell className="text-gray-500 text-sm truncate max-w-[200px]">/products/mug</TableCell>
                  <TableCell className="text-gray-500 text-sm">Desktop (Chrome)</TableCell>
                  <TableCell className="text-gray-500 text-sm">CA (ON)</TableCell>
                </TableRow>
              </TableBody>
            </Table>
            <div className="p-4 border-t border-gray-100 text-center text-xs text-gray-400">
              User Activity Logs are retained indefinitely. Showing 50 of 1,240,491 records.
            </div>
          </Card>
        </TabsContent>

        {/* Tab 2: Admin Audit */}
        <TabsContent value="audit">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Changes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="text-gray-500 text-xs">2026-08-01 17:30:10</TableCell>
                  <TableCell className="font-medium text-sm">f***@upsidetree.ca</TableCell>
                  <TableCell><Badge variant="outline" className="bg-orange-50 text-orange-700">product_updated</Badge></TableCell>
                  <TableCell className="text-sm">Product: Cypress Tee</TableCell>
                  <TableCell className="text-sm text-blue-600 hover:underline cursor-pointer">View Diff</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Tab 3: System Events */}
        <TabsContent value="system">
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
                <TableRow>
                  <TableCell className="text-gray-500 text-xs">2026-08-01 17:25:00</TableCell>
                  <TableCell className="font-medium text-sm">Printful</TableCell>
                  <TableCell><Badge variant="outline" className="bg-purple-50 text-purple-700">printful_order_submitted</Badge></TableCell>
                  <TableCell><Badge className="bg-green-500">Success</Badge></TableCell>
                  <TableCell className="text-gray-500 text-sm">450ms</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-gray-500 text-xs">2026-08-01 17:00:00</TableCell>
                  <TableCell className="font-medium text-sm">Cron</TableCell>
                  <TableCell><Badge variant="outline" className="bg-gray-100 text-gray-700">cron_points_expiry_run</Badge></TableCell>
                  <TableCell><Badge className="bg-green-500">Success</Badge></TableCell>
                  <TableCell className="text-gray-500 text-sm">1200ms</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Tab 4: Security */}
        <TabsContent value="security">
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 mb-4 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-sm">Critical Security Alert</h3>
              <p className="text-sm mt-1">20 failed login attempts detected from a single IP address in the last 1 hour. IP has been automatically blocked.</p>
            </div>
          </div>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>IP Address (Hashed)</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="text-gray-500 text-xs">2026-08-01 16:45:12</TableCell>
                  <TableCell className="font-medium text-sm">Unknown</TableCell>
                  <TableCell><Badge variant="outline" className="bg-red-50 text-red-700">customer_login_locked</Badge></TableCell>
                  <TableCell><Badge variant="destructive">Critical</Badge></TableCell>
                  <TableCell className="font-mono text-xs text-gray-500">e3b0c44298fc1c14...</TableCell>
                  <TableCell><Badge variant="outline" className="bg-red-100 text-red-800">Blocked</Badge></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
