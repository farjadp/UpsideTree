import { Button } from "@/components/ui/Button";
import { ArrowLeft, UserPlus } from "lucide-react";
import Link from "next/link";
import { createCustomer } from "../actions";

export default function AddCustomerPage() {
  return (
    <div className="space-y-6 pb-12 animate-fade-in max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/customers"
          className="p-2 rounded-xl bg-slate-900/50 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors border border-white/5"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-display font-semibold text-white tracking-tight">Add New User</h1>
          <p className="text-sm text-slate-400 mt-1">Create a new user account.</p>
        </div>
      </div>

      <div className="rounded-2xl bg-slate-900/50 backdrop-blur-sm border border-white/10 p-6 shadow-xl">
        <form action={createCustomer} className="space-y-8">
          
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-white border-b border-white/10 pb-2">Basic Info</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">First Name</label>
                <input type="text" name="first_name" required className="w-full px-4 py-2 bg-slate-950/50 border border-white/10 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-lapis-500/50" placeholder="John" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Last Name</label>
                <input type="text" name="last_name" required className="w-full px-4 py-2 bg-slate-950/50 border border-white/10 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-lapis-500/50" placeholder="Doe" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Email Address</label>
                <input type="email" name="email" required className="w-full px-4 py-2 bg-slate-950/50 border border-white/10 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-lapis-500/50" placeholder="john@example.com" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Password</label>
                <input type="password" name="password" required minLength={6} className="w-full px-4 py-2 bg-slate-950/50 border border-white/10 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-lapis-500/50" placeholder="••••••••" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Role</label>
                <select name="role" className="w-full px-4 py-2 bg-slate-950/50 border border-white/10 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-lapis-500/50 appearance-none">
                  <option value="CUSTOMER">Customer</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Phone</label>
                <input type="tel" name="phone" className="w-full px-4 py-2 bg-slate-950/50 border border-white/10 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-lapis-500/50" placeholder="+1 (555) 000-0000" />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-lg font-medium text-white border-b border-white/10 pb-2">Additional Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Birth Date</label>
                <input type="date" name="birth_date" className="w-full px-4 py-2 bg-slate-950/50 border border-white/10 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-lapis-500/50" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Gender</label>
                <select name="gender" className="w-full px-4 py-2 bg-slate-950/50 border border-white/10 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-lapis-500/50 appearance-none">
                  <option value="">Select Gender...</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Preferred Language</label>
                <select name="preferred_language" className="w-full px-4 py-2 bg-slate-950/50 border border-white/10 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-lapis-500/50 appearance-none">
                  <option value="en">English (EN)</option>
                  <option value="fa">Persian (FA)</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Preferred Currency</label>
                <select name="preferred_currency" className="w-full px-4 py-2 bg-slate-950/50 border border-white/10 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-lapis-500/50 appearance-none">
                  <option value="CAD">CAD - Canadian Dollar</option>
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                </select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-slate-300">Bio</label>
                <textarea name="bio" rows={3} className="w-full px-4 py-2 bg-slate-950/50 border border-white/10 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-lapis-500/50" placeholder="A short bio about this user..." />
              </div>
              <div className="flex items-center space-x-3 md:col-span-2 p-4 rounded-xl bg-slate-950/30 border border-white/5">
                <input type="checkbox" id="is_iranian_diaspora" name="is_iranian_diaspora" className="w-5 h-5 rounded border-slate-600 bg-slate-900 text-lapis-500 focus:ring-lapis-500 focus:ring-offset-slate-900" />
                <label htmlFor="is_iranian_diaspora" className="text-sm font-medium text-slate-300 cursor-pointer">
                  Iranian Diaspora Member
                </label>
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <Button
              type="submit"
              className="bg-gradient-to-r from-lapis-600 to-lapis-500 hover:from-lapis-500 hover:to-lapis-400 text-white border-0"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Create User
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
