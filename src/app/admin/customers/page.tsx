import { createClient } from "@/utils/supabase/server";
import { Button } from "@/components/ui/Button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, MoreHorizontal, Mail, MapPin, ShieldAlert, ShieldCheck, Plus, Pencil, Trash, Activity } from "lucide-react";
import { Input } from "@/components/ui/input";
import Link from "next/link";

export default async function CustomersPage() {
  const supabase = await createClient();
  const { data: customers, error } = await supabase
    .from("customer_profiles")
    .select(`*`)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching customers:", error);
  }

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-semibold text-white tracking-tight">Users</h1>
          <p className="text-sm text-slate-400 mt-1">Manage user accounts and roles.</p>
        </div>
        <Link
          href="/admin/customers/new"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-lapis-600 to-lapis-500 hover:from-lapis-500 hover:to-lapis-400 text-white font-medium text-sm shadow-[0_4px_20px_rgba(29,78,137,0.4)] transition-all transform hover:-translate-y-0.5"
        >
          <Plus className="w-4 h-4" />
          Add User
        </Link>
      </div>

      <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-900/50 backdrop-blur-sm border border-white/10">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search users..."
            className="w-full pl-9 pr-4 py-2 bg-slate-950/50 border border-white/10 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-lapis-500/50"
          />
        </div>
      </div>

      <div className="rounded-2xl bg-slate-900/50 backdrop-blur-sm border border-white/10 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/60 text-slate-400 uppercase text-xs tracking-wider border-b border-white/10">
              <tr>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Joined</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {!customers || customers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-500">
                    No users found.
                  </td>
                </tr>
              ) : (
                customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-white flex items-center gap-2">
                        {customer.first_name} {customer.last_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      <div className="flex flex-col gap-1">
                        <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> {customer.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        customer.role === 'ADMIN' 
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                          : 'bg-slate-800 text-slate-400 border border-white/5'
                      }`}>
                        {customer.role === 'ADMIN' ? <ShieldAlert className="w-3 h-3" /> : <ShieldCheck className="w-3 h-3" />}
                        {customer.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                        customer.account_status === 'active' 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        {customer.account_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-xs">
                      {new Date(customer.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/customers/${customer.id}/edit`}
                          className="p-2 rounded-lg bg-slate-950/60 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                          title="View Activity Logs"
                        >
                          <Activity className="w-4 h-4" />
                        </Link>
                        <Link
                          href={`/admin/customers/${customer.id}/edit`}
                          className="p-2 rounded-lg bg-slate-950/60 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                          title="Edit User"
                        >
                          <Pencil className="w-4 h-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
