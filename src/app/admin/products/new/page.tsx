import { ProductEditorForm } from "@/components/admin/ProductEditorForm";
import { getStoredProductAttributes } from "@/lib/product-attribute-metadata";
import { createClient } from "@/utils/supabase/server";

export default async function NewProductPage() {
  const supabase = await createClient();
  const [{ data: collections }, attributes] = await Promise.all([
    supabase.from("collections").select("id, name_en, name_fa").order("name_en", { ascending: true }),
    getStoredProductAttributes(),
  ]);

  return (
    <ProductEditorForm
      mode="create"
      collections={collections || []}
      attributes={attributes || []}
      variants={[]}
    />
  );
}
