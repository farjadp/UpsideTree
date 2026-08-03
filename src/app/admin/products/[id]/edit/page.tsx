import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { ProductEditorForm } from "@/components/admin/ProductEditorForm";
import { getStoredProductAttributes } from "@/lib/product-attribute-metadata";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: product, error }, attributes, { data: collections }] = await Promise.all([
    supabase
    .from("products")
    .select("*, product_variants(*)")
    .eq("id", id)
    .single(),
    getStoredProductAttributes(),
    supabase.from("collections").select("id, name_en, name_fa").order("name_en", { ascending: true }),
  ]);

  if (error || !product) {
    notFound();
  }

  return (
    <ProductEditorForm
      mode="edit"
      product={product}
      variants={product.product_variants || []}
      attributes={attributes || []}
      collections={collections || []}
    />
  );
}
