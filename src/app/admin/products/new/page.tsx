import { ProductEditorForm } from "@/components/admin/ProductEditorForm";
import { createClient } from "@/utils/supabase/server";

export default async function NewProductPage() {
  const supabase = await createClient();
  const [{ data: collections }, { data: attributes }] = await Promise.all([
    supabase.from("collections").select("id, name_en, name_fa").order("name_en", { ascending: true }),
    supabase.from("product_attributes").select("*").order("sort_order", { ascending: true }),
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
