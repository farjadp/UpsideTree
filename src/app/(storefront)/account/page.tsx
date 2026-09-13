import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AccountFlash } from "@/components/account/AccountFlash";
import { requireCustomer, formatDate, formatMoney, resolveTier } from "@/lib/account";
import { updateProfile } from "./actions";
import { ShoppingBag, Gift, MapPin, BadgeCheck } from "lucide-react";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; error?: string }>;
}) {
  const { message, error } = await searchParams;
  const { supabase, user } = await requireCustomer();

  const [{ data: profile }, { data: loyalty }, orderStats, { count: addressCount }] = await Promise.all([
    supabase.from("customer_profiles").select("*").eq("id", user.id).single(),
    supabase.from("loyalty_accounts").select("*").eq("customer_id", user.id).maybeSingle(),
    supabase.from("orders").select("total, exchange_rate", { count: "exact" }).eq("customer_id", user.id),
    supabase.from("customer_addresses").select("id", { count: "exact", head: true }).eq("customer_id", user.id),
  ]);

  const orderCount = orderStats.count ?? 0;
  // Shown in CAD: EUR orders are converted back with their stored rate.
  const lifetimeSpend = (orderStats.data ?? []).reduce(
    (sum, o) => sum + Number(o.total ?? 0) / (Number(o.exchange_rate) || 1),
    0
  );
  const tier = resolveTier(loyalty?.total_points_earned ?? 0);

  const stats = [
    { label: "Orders", value: String(orderCount), icon: ShoppingBag, href: "/account/orders" },
    { label: "Lifetime spend", value: formatMoney(lifetimeSpend), icon: BadgeCheck, href: "/account/orders" },
    { label: "Points balance", value: `${loyalty?.current_balance ?? 0} pts`, icon: Gift, href: "/account/loyalty" },
    { label: "Saved addresses", value: String(addressCount ?? 0), icon: MapPin, href: "/account/addresses" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-serif font-bold text-[#18231F]">My Profile</h2>
        <p className="text-gray-500">Your personal details and account overview.</p>
      </div>

      <AccountFlash message={message} error={error} />

      {/* Snapshot */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="rounded-xl border border-[#18231F]/10 bg-[#F4EFE3]/40 p-4 transition-colors hover:border-[#18231F]/25 hover:bg-[#F4EFE3]/70"
          >
            <stat.icon className="mb-2 h-5 w-5 text-[#1D4E89]" />
            <p className="text-xs uppercase tracking-wide text-gray-500">{stat.label}</p>
            <p className="mt-1 text-lg font-bold text-[#18231F]">{stat.value}</p>
          </Link>
        ))}
      </div>

      {/* Identity strip */}
      <div className="flex flex-col gap-4 rounded-xl border border-[#18231F]/10 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-gray-500">Signed in as</p>
          <p className="font-medium text-[#18231F]">{profile?.email ?? user.email}</p>
          <p className="mt-1 text-xs text-gray-400">
            Member since {formatDate(profile?.created_at)}
          </p>
        </div>
        <div
          className="inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium text-white"
          style={{ backgroundColor: tier.color }}
        >
          <Gift className="h-4 w-4" />
          <span>{tier.tier}</span>
          <span className="ml-1 border-l border-white/30 pl-2 font-persian text-white/90">{tier.fa}</span>
        </div>
      </div>

      {/* Editable details */}
      <form action={updateProfile} className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="first_name">First name</Label>
            <Input id="first_name" name="first_name" defaultValue={profile?.first_name ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="last_name">Last name</Label>
            <Input id="last_name" name="last_name" defaultValue={profile?.last_name ?? ""} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="display_name">Display name</Label>
            <Input
              id="display_name"
              name="display_name"
              placeholder="Shown on reviews"
              defaultValue={profile?.display_name ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" name="phone" type="tel" defaultValue={profile?.phone ?? ""} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="birth_date">Birth date</Label>
            <Input id="birth_date" name="birth_date" type="date" defaultValue={profile?.birth_date ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="preferred_language">Language</Label>
            <select
              id="preferred_language"
              name="preferred_language"
              defaultValue={profile?.preferred_language ?? "en"}
              className="h-9 w-full rounded-md border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D4E89]"
            >
              <option value="en">English</option>
              <option value="fa">فارسی</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="preferred_currency">Currency</Label>
            <select
              id="preferred_currency"
              name="preferred_currency"
              defaultValue={profile?.preferred_currency ?? "CAD"}
              className="h-9 w-full rounded-md border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D4E89]"
            >
              <option value="CAD">CAD</option>
              <option value="USD">USD</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="bio">Bio</Label>
          <textarea
            id="bio"
            name="bio"
            rows={3}
            defaultValue={profile?.bio ?? ""}
            className="w-full rounded-md border border-gray-200 bg-white p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D4E89]"
          />
        </div>

        {/* Email lives in auth.users, not customer_profiles — changing it
            needs a verification round-trip, so it's read-only here rather
            than a field that looks editable but silently does nothing. */}
        <p className="text-xs text-gray-400">
          To change your email address, contact support from the{" "}
          <Link href="/account/support" className="text-[#1D4E89] hover:underline">
            Support
          </Link>{" "}
          page.
        </p>

        <div className="flex justify-end">
          <Button type="submit" className="bg-[#18231F] text-[#F4EFE3] hover:bg-[#18231F]/90">
            Save changes
          </Button>
        </div>
      </form>
    </div>
  );
}
