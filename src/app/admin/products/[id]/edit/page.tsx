import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { ProductEditorForm } from "@/components/admin/ProductEditorForm";
import { getStoredProductAttributes } from "@/lib/product-attribute-metadata";
import { applyProductMetadata, getProductMetadataMap } from "@/lib/product-metadata";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: product, error }, attributes, { data: collections }, productMetadata] = await Promise.all([
    supabase
    .from("products")
    .select("*, product_variants(*)")
    .eq("id", id)
    .single(),
    getStoredProductAttributes(),
    supabase.from("collections").select("id, name_en, name_fa").order("name_en", { ascending: true }),
    getProductMetadataMap(),
  ]);

  if (error || !product) {
    notFound();
  }

  const [mergedProduct] = applyProductMetadata([product], productMetadata);

  return (
    <ProductEditorForm
      mode="edit"
      product={mergedProduct}
      variants={product.product_variants || []}
      attributes={attributes || []}
      collections={collections || []}
    />
  );
}
