import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { AccountFlash } from "@/components/account/AccountFlash";
import { requireCustomer, formatMoney, oneRelation, type WishlistProductRow } from "@/lib/account";
import { removeFromWishlist } from "../actions";
import { Heart } from "lucide-react";

export default async function WishlistPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; error?: string }>;
}) {
  const { message, error } = await searchParams;
  const { supabase, user } = await requireCustomer();

  const { data: entries } = await supabase
    .from("customer_wishlist")
    .select("id, added_at, products(id, slug, name_en, name_fa, price, sale_price, currency, featured_image_url, status)")
    .eq("customer_id", user.id)
    .order("added_at", { ascending: false });

  // A product can be archived or deleted after being wishlisted; drop those
  // rather than rendering a card that links nowhere.
  const items = (entries ?? [])
    .map((entry) => ({ id: entry.id, product: oneRelation<WishlistProductRow>(entry.products) }))
    .filter((entry): entry is { id: string; product: WishlistProductRow } => entry.product !== null);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-serif text-2xl font-bold text-[#18231F]">Wishlist</h2>
        <p className="text-gray-500">Pieces you&apos;ve saved for later.</p>
      </div>

      <AccountFlash message={message} error={error} />

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#18231F]/15 py-16 text-center">
          <Heart className="mx-auto mb-4 h-10 w-10 text-gray-300" />
          <h3 className="font-serif text-lg text-[#18231F]">Your wishlist is empty</h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500">
            Save pieces you love and they&apos;ll be waiting here.
          </p>
          <Link href="/collections" className="mt-6 inline-block">
            <Button className="bg-[#18231F] text-[#F4EFE3] hover:bg-[#18231F]/90">Browse collections</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((entry) => {
            const product = entry.product;
            const price = product.sale_price ?? product.price;

            return (
              <div key={entry.id} className="overflow-hidden rounded-xl border border-[#18231F]/10">
                <Link href={`/products/${product.slug}`} className="block">
                  <div className="relative aspect-square bg-[#F4EFE3]">
                    {product.featured_image_url && (
                      <Image
                        src={product.featured_image_url}
                        alt={product.name_en ?? "Product"}
                        fill
                        sizes="(max-width: 640px) 100vw, 33vw"
                        className="object-cover"
                      />
                    )}
                  </div>
                </Link>
                <div className="p-4">
                  <Link href={`/products/${product.slug}`}>
                    <p className="font-medium text-[#18231F] hover:text-[#1D4E89]">{product.name_en}</p>
                  </Link>
                  {product.name_fa && (
                    <p className="font-persian text-sm text-gray-400" dir="rtl">
                      {product.name_fa}
                    </p>
                  )}
                  <p className="mt-2 font-medium text-[#18231F]">
                    {formatMoney(price, product.currency ?? "CAD")}
                  </p>
                  {String(product.status).toLowerCase() !== "active" && (
                    <p className="mt-1 text-xs text-amber-600">Currently unavailable</p>
                  )}

                  <form action={removeFromWishlist} className="mt-3">
                    <input type="hidden" name="product_id" value={product.id} />
                    <button type="submit" className="text-sm text-red-600 hover:underline">
                      Remove
                    </button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
