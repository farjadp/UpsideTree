import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveAddress } from "@/app/(storefront)/account/actions";

type Address = {
  id: string;
  label: string | null;
  first_name: string;
  last_name: string;
  company: string | null;
  address_line_1: string;
  address_line_2: string | null;
  city: string;
  province_state: string;
  postal_code: string;
  country: string | null;
  phone: string | null;
  delivery_notes: string | null;
  is_default: boolean | null;
};

export function AddressForm({
  address,
  defaultFirstName,
  defaultLastName,
  defaultPhone,
  isFirstAddress,
}: {
  address: Address | null;
  defaultFirstName: string;
  defaultLastName: string;
  defaultPhone: string;
  isFirstAddress: boolean;
}) {
  // `key` forces React to rebuild the uncontrolled inputs when switching
  // between "add" and "edit <id>" — without it the defaultValues of the
  // previous mode stick around.
  return (
    <form key={address?.id ?? "new"} action={saveAddress} className="space-y-4">
      {address && <input type="hidden" name="id" value={address.id} />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="label">Label</Label>
          <Input id="label" name="label" placeholder="Home, Work…" defaultValue={address?.label ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="company">Company (optional)</Label>
          <Input id="company" name="company" defaultValue={address?.company ?? ""} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="address_first_name">First name</Label>
          <Input
            id="address_first_name"
            name="first_name"
            required
            defaultValue={address?.first_name ?? defaultFirstName}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="address_last_name">Last name</Label>
          <Input
            id="address_last_name"
            name="last_name"
            required
            defaultValue={address?.last_name ?? defaultLastName}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address_line_1">Street address</Label>
        <Input id="address_line_1" name="address_line_1" required defaultValue={address?.address_line_1 ?? ""} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="address_line_2">Apartment / suite (optional)</Label>
        <Input id="address_line_2" name="address_line_2" defaultValue={address?.address_line_2 ?? ""} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="city">City</Label>
          <Input id="city" name="city" required defaultValue={address?.city ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="province_state">Province / State</Label>
          <Input id="province_state" name="province_state" required defaultValue={address?.province_state ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="postal_code">Postal code</Label>
          <Input id="postal_code" name="postal_code" required defaultValue={address?.postal_code ?? ""} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="country">Country</Label>
          <select
            id="country"
            name="country"
            defaultValue={address?.country ?? "CA"}
            className="h-9 w-full rounded-md border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D4E89]"
          >
            <option value="CA">Canada</option>
            <option value="US">United States</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="address_phone">Phone</Label>
          <Input id="address_phone" name="phone" type="tel" defaultValue={address?.phone ?? defaultPhone} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="delivery_notes">Delivery notes (optional)</Label>
        <textarea
          id="delivery_notes"
          name="delivery_notes"
          rows={2}
          defaultValue={address?.delivery_notes ?? ""}
          className="w-full rounded-md border border-gray-200 bg-white p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D4E89]"
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-600">
        <input
          type="checkbox"
          name="is_default"
          defaultChecked={address?.is_default ?? isFirstAddress}
          className="h-4 w-4 rounded border-gray-300"
        />
        Use as my default address
      </label>

      <div className="flex justify-end gap-3">
        {address && (
          <Link href="/account/addresses">
            <Button type="button" variant="outline" className="border-[#18231F]/20 text-[#18231F] hover:bg-[#F4EFE3]">
              Cancel
            </Button>
          </Link>
        )}
        <Button type="submit" className="bg-[#18231F] text-[#F4EFE3] hover:bg-[#18231F]/90">
          {address ? "Update address" : "Add address"}
        </Button>
      </div>
    </form>
  );
}
