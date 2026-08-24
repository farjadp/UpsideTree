import { AccountFlash } from "@/components/account/AccountFlash";
import { AddressForm } from "@/components/account/AddressForm";
import { requireCustomer } from "@/lib/account";
import { deleteAddress } from "../actions";
import { MapPin, Star } from "lucide-react";

export default async function AddressesPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; error?: string; edit?: string }>;
}) {
  const { message, error, edit } = await searchParams;
  const { supabase, user } = await requireCustomer();

  const [{ data: addresses }, { data: profile }] = await Promise.all([
    supabase
      .from("customer_addresses")
      .select("*")
      .eq("customer_id", user.id)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase.from("customer_profiles").select("first_name, last_name, phone").eq("id", user.id).single(),
  ]);

  const list = addresses ?? [];
  const editing = edit ? list.find((a) => a.id === edit) ?? null : null;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-serif text-2xl font-bold text-[#18231F]">Addresses</h2>
        <p className="text-gray-500">Saved delivery addresses for faster checkout.</p>
      </div>

      <AccountFlash message={message} error={error} />

      {list.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {list.map((address) => (
            <div key={address.id} className="relative rounded-xl border border-[#18231F]/10 p-5">
              <div className="mb-2 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-[#1D4E89]" />
                <span className="font-medium text-[#18231F]">{address.label || "Address"}</span>
                {address.is_default && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                    <Star className="h-3 w-3" />
                    Default
                  </span>
                )}
              </div>
              <address className="text-sm not-italic leading-relaxed text-gray-600">
                <div>
                  {address.first_name} {address.last_name}
                </div>
                {address.company && <div>{address.company}</div>}
                <div>{address.address_line_1}</div>
                {address.address_line_2 && <div>{address.address_line_2}</div>}
                <div>
                  {[address.city, address.province_state, address.postal_code].filter(Boolean).join(", ")}
                </div>
                <div>{address.country}</div>
                {address.phone && <div>{address.phone}</div>}
              </address>

              <div className="mt-4 flex gap-3 text-sm">
                <a href={`/account/addresses?edit=${address.id}`} className="text-[#1D4E89] hover:underline">
                  Edit
                </a>
                <form action={deleteAddress}>
                  <input type="hidden" name="id" value={address.id} />
                  <button type="submit" className="text-red-600 hover:underline">
                    Remove
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-[#18231F]/10 p-6">
        <h3 className="mb-4 font-medium text-[#18231F]">
          {editing ? "Edit address" : "Add a new address"}
        </h3>
        <AddressForm
          address={editing}
          defaultFirstName={profile?.first_name ?? ""}
          defaultLastName={profile?.last_name ?? ""}
          defaultPhone={profile?.phone ?? ""}
          isFirstAddress={list.length === 0}
        />
      </div>

      {list.length === 0 && (
        <p className="text-center text-sm text-gray-400">
          You have no saved addresses yet — the first one you add becomes your default.
        </p>
      )}
    </div>
  );
}
