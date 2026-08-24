import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AccountFlash } from "@/components/account/AccountFlash";
import { requireCustomer } from "@/lib/account";
import { updatePreferences, changePassword } from "../actions";

const EMAIL_PREFS = [
  { name: "email_order_updates", label: "Order updates", hint: "Confirmations and status changes" },
  { name: "email_shipping_updates", label: "Shipping updates", hint: "Dispatch and tracking notifications" },
  { name: "email_new_collections", label: "New collections", hint: "When a new collection launches" },
  { name: "email_story_posts", label: "Stories", hint: "Long-form pieces about the making and meaning" },
  { name: "email_nowruz_campaign", label: "Nowruz campaign", hint: "Seasonal Nowruz offers" },
  { name: "email_yalda_campaign", label: "Yalda campaign", hint: "Seasonal Yalda offers" },
  { name: "email_promotions", label: "Promotions", hint: "General offers and discounts" },
];

const PUSH_PREFS = [
  { name: "push_order_updates", label: "Order updates" },
  { name: "push_new_collections", label: "New collections" },
  { name: "push_back_in_stock", label: "Back in stock" },
  { name: "push_points_earned", label: "Points earned" },
];

const SMS_PREFS = [
  { name: "sms_order_updates", label: "Order updates" },
  { name: "sms_promotions", label: "Promotions" },
];

function Toggle({
  name,
  label,
  hint,
  defaultChecked,
}: {
  name: string;
  label: string;
  hint?: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex items-start gap-3 py-2">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="mt-0.5 h-4 w-4 rounded border-gray-300"
      />
      <span>
        <span className="block text-sm font-medium text-[#18231F]">{label}</span>
        {hint && <span className="block text-xs text-gray-500">{hint}</span>}
      </span>
    </label>
  );
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; error?: string }>;
}) {
  const { message, error } = await searchParams;
  const { supabase, user } = await requireCustomer();

  const { data: prefs } = await supabase
    .from("customer_preferences")
    .select("*")
    .eq("customer_id", user.id)
    .maybeSingle();

  // Defaults mirror the column defaults in schema.sql so the form still
  // renders sensibly if the preferences row is somehow missing.
  const on = (key: string, fallback: boolean) => (prefs ? Boolean(prefs[key]) : fallback);

  return (
    <div className="space-y-10">
      <div>
        <h2 className="font-serif text-2xl font-bold text-[#18231F]">Settings</h2>
        <p className="text-gray-500">Control what we send you, and manage your password.</p>
      </div>

      <AccountFlash message={message} error={error} />

      <form action={updatePreferences} className="space-y-8">
        <section>
          <h3 className="mb-1 font-medium text-[#18231F]">Email</h3>
          <p className="mb-3 text-sm text-gray-500">Choose which emails you&apos;d like to receive.</p>
          <div className="divide-y divide-[#18231F]/5 rounded-xl border border-[#18231F]/10 px-5 py-2">
            {EMAIL_PREFS.map((pref) => (
              <Toggle
                key={pref.name}
                name={pref.name}
                label={pref.label}
                hint={pref.hint}
                defaultChecked={on(pref.name, pref.name !== "email_story_posts")}
              />
            ))}
          </div>
        </section>

        <section>
          <h3 className="mb-3 font-medium text-[#18231F]">Push notifications</h3>
          <div className="divide-y divide-[#18231F]/5 rounded-xl border border-[#18231F]/10 px-5 py-2">
            {PUSH_PREFS.map((pref) => (
              <Toggle
                key={pref.name}
                name={pref.name}
                label={pref.label}
                defaultChecked={on(pref.name, pref.name !== "push_new_collections")}
              />
            ))}
          </div>
        </section>

        <section>
          <h3 className="mb-3 font-medium text-[#18231F]">SMS</h3>
          <div className="divide-y divide-[#18231F]/5 rounded-xl border border-[#18231F]/10 px-5 py-2">
            {SMS_PREFS.map((pref) => (
              <Toggle key={pref.name} name={pref.name} label={pref.label} defaultChecked={on(pref.name, false)} />
            ))}
          </div>
        </section>

        <div className="flex justify-end">
          <Button type="submit" className="bg-[#18231F] text-[#F4EFE3] hover:bg-[#18231F]/90">
            Save preferences
          </Button>
        </div>
      </form>

      <section className="border-t border-[#18231F]/10 pt-8">
        <h3 className="mb-1 font-medium text-[#18231F]">Password</h3>
        <p className="mb-4 text-sm text-gray-500">Choose a new password of at least 8 characters.</p>

        <form action={changePassword} className="max-w-md space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">New password</Label>
            <Input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm_password">Confirm new password</Label>
            <Input
              id="confirm_password"
              name="confirm_password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" variant="outline" className="border-[#18231F]/20 text-[#18231F] hover:bg-[#F4EFE3]">
              Update password
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
