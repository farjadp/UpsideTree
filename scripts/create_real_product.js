const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Supabase environment variables are missing.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const product = {
  slug: "iran-cuneiform-mens-tshirt",
  name_en: "Iran in Cuneiform Men's T-Shirt",
  name_fa: "تی‌شرت مردانه ایران با خط میخی",
  description_en:
    "A men's statement t-shirt built around the word Iran rendered in a cuneiform-inspired visual language. Clean, modern, and rooted in ancient Persian inscriptions.",
  description_fa:
    "یک تی‌شرت مردانه با محوریت واژه ایران در فرمی الهام‌گرفته از خط میخی؛ طراحی‌ای مینیمال، معاصر و ریشه‌دار در کتیبه‌های ایران باستان.",
  price: 48,
  currency: "CAD",
  stock_level: 24,
  status: "Active",
};

async function main() {
  const { data: existing, error: existingError } = await supabase
    .from("products")
    .select("id, slug")
    .eq("slug", product.slug)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existing) {
    const { data, error } = await supabase
      .from("products")
      .update(product)
      .eq("id", existing.id)
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    console.log(JSON.stringify({ action: "updated", product: data }, null, 2));
    return;
  }

  const { data, error } = await supabase
    .from("products")
    .insert(product)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  console.log(JSON.stringify({ action: "created", product: data }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
