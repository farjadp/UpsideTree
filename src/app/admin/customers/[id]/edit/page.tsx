import { createClient } from "@/utils/supabase/server";
import { Button } from "@/components/ui/Button";
import { ArrowLeft, UserCog, Trash, Activity, Laptop, Monitor, Phone, Search } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { updateCustomer, deleteCustomer } from "../../actions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function getDeviceIcon(deviceType: string | null) {
  if (deviceType?.toLowerCase().includes("mobile") || deviceType?.toLowerCase().includes("phone")) {
    return <Phone className="w-4 h-4 text-slate-400" />;
  }
  if (deviceType?.toLowerCase().includes("desktop") || deviceType?.toLowerCase().includes("mac") || deviceType?.toLowerCase().includes("windows")) {
    return <Monitor className="w-4 h-4 text-slate-400" />;
  }
  return <Laptop className="w-4 h-4 text-slate-400" />;
}

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  
  // Fetch user profile
  const { data: customer, error } = await supabase
    .from("customer_profiles")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !customer) {
    notFound();
  }
  
  // Fetch user activity logs
  const { data: activityLogs } = await supabase
    .from("user_activity_logs")
    .select("*")
    .eq("customer_id", customer.id)
    .order("created_at", { ascending: false })
    .limit(50);

  // Pre-bind the update action with the user ID
  const updateCustomerAction = updateCustomer.bind(null, customer.id);
  const deleteCustomerAction = deleteCustomer.bind(null, customer.id);

  return (
    <div className="space-y-6 pb-12 animate-fade-in max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/customers"
            className="p-2 rounded-xl bg-slate-900/50 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors border border-white/5"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-display font-semibold text-white tracking-tight">
              Edit User: {customer.first_name} {customer.last_name}
            </h1>
            <p className="text-sm text-slate-400 mt-1">Manage account, details, and view activity.</p>
          </div>
        </div>
        
        {/* Delete Form */}
        <form action={deleteCustomerAction}>
          <Button 
            variant="destructive"
            className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20"
            type="submit"
          >
            <Trash className="w-4 h-4 mr-2" />
            Delete User
          </Button>
        </form>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="mb-6 bg-slate-900/50 border border-white/10 p-1">
          <TabsTrigger value="profile" className="data-[state=active]:bg-lapis-600 data-[state=active]:text-white">
            Profile Details
          </TabsTrigger>
          <TabsTrigger value="activity" className="data-[state=active]:bg-lapis-600 data-[state=active]:text-white">
            <Activity className="w-4 h-4 mr-2" />
            Activity Logs
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="profile">
          <div className="rounded-2xl bg-slate-900/50 backdrop-blur-sm border border-white/10 p-6 shadow-xl">
            <form action={updateCustomerAction} className="space-y-8">
              
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-white border-b border-white/10 pb-2">Basic Info</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">First Name</label>
                    <input type="text" name="first_name" defaultValue={customer.first_name || ""} required className="w-full px-4 py-2 bg-slate-950/50 border border-white/10 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-lapis-500/50" />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Last Name</label>
                    <input type="text" name="last_name" defaultValue={customer.last_name || ""} required className="w-full px-4 py-2 bg-slate-950/50 border border-white/10 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-lapis-500/50" />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Phone</label>
                    <input type="tel" name="phone" defaultValue={customer.phone || ""} className="w-full px-4 py-2 bg-slate-950/50 border border-white/10 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-lapis-500/50" />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Role</label>
                    <select name="role" defaultValue={customer.role || "CUSTOMER"} className="w-full px-4 py-2 bg-slate-950/50 border border-white/10 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-lapis-500/50 appearance-none">
                      <option value="CUSTOMER">Customer</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Account Status</label>
                    <select name="account_status" defaultValue={customer.account_status || "active"} className="w-full px-4 py-2 bg-slate-950/50 border border-white/10 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-lapis-500/50 appearance-none">
                      <option value="active">Active</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="text-lg font-medium text-white border-b border-white/10 pb-2">Additional Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Birth Date</label>
                    <input type="date" name="birth_date" defaultValue={customer.birth_date || ""} className="w-full px-4 py-2 bg-slate-950/50 border border-white/10 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-lapis-500/50" />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Gender</label>
                    <select name="gender" defaultValue={customer.gender || ""} className="w-full px-4 py-2 bg-slate-950/50 border border-white/10 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-lapis-500/50 appearance-none">
                      <option value="">Select Gender...</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                      <option value="prefer_not_to_say">Prefer not to say</option>
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Preferred Language</label>
                    <select name="preferred_language" defaultValue={customer.preferred_language || "en"} className="w-full px-4 py-2 bg-slate-950/50 border border-white/10 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-lapis-500/50 appearance-none">
                      <option value="en">English (EN)</option>
                      <option value="fa">Persian (FA)</option>
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Preferred Currency</label>
                    <select name="preferred_currency" defaultValue={customer.preferred_currency || "CAD"} className="w-full px-4 py-2 bg-slate-950/50 border border-white/10 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-lapis-500/50 appearance-none">
                      <option value="CAD">CAD - Canadian Dollar</option>
                      <option value="USD">USD - US Dollar</option>
                      <option value="EUR">EUR - Euro</option>
                      <option value="GBP">GBP - British Pound</option>
                    </select>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium text-slate-300">Bio</label>
                    <textarea name="bio" rows={3} defaultValue={customer.bio || ""} className="w-full px-4 py-2 bg-slate-950/50 border border-white/10 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-lapis-500/50" placeholder="A short bio about this user..." />
                  </div>
                  
                  <div className="flex items-center space-x-3 md:col-span-2 p-4 rounded-xl bg-slate-950/30 border border-white/5">
                    <input type="checkbox" id="is_iranian_diaspora" name="is_iranian_diaspora" defaultChecked={customer.is_iranian_diaspora} className="w-5 h-5 rounded border-slate-600 bg-slate-900 text-lapis-500 focus:ring-lapis-500 focus:ring-offset-slate-900" />
                    <label htmlFor="is_iranian_diaspora" className="text-sm font-medium text-slate-300 cursor-pointer">
                      Iranian Diaspora Member
                    </label>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end border-t border-white/5 mt-6">
                <Button
                  type="submit"
                  className="bg-gradient-to-r from-lapis-600 to-lapis-500 hover:from-lapis-500 hover:to-lapis-400 text-white border-0"
                >
                  <UserCog className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </TabsContent>
        
        <TabsContent value="activity">
          <div className="rounded-2xl bg-slate-900/50 backdrop-blur-sm border border-white/10 overflow-hidden shadow-xl">
            <div className="p-4 border-b border-white/10 bg-slate-950/40">
              <h3 className="text-lg font-medium text-white">Recent Activity</h3>
              <p className="text-sm text-slate-400">The last 50 actions performed by this user.</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950/60 text-slate-400 uppercase text-xs tracking-wider border-b border-white/10">
                  <tr>
                    <th className="px-6 py-4">Event</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4">Context</th>
                    <th className="px-6 py-4">Device</th>
                    <th className="px-6 py-4 text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {!activityLogs || activityLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-slate-500">
                        No activity logs found for this user.
                      </td>
                    </tr>
                  ) : (
                    activityLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-medium text-white">
                            {log.event_type}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-white/5">
                            {log.event_category}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-400 text-xs">
                          <div className="max-w-[200px] truncate" title={log.page_url}>
                            {log.page_url || "-"}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-xs text-slate-400">
                            {getDeviceIcon(log.device_type)}
                            <span>{log.os || "Unknown OS"}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right text-slate-500 text-xs">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
