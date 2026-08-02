const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({path: '.env.local'});
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
supabase.from('products').select(`*, collections ( id, name_en, name_fa, slug, story_en, story_fa ), product_variants ( id, color, size, price, stock_quantity, sku, is_active )`).eq('slug', 'lion-and-sun-geometric-tee').eq('status', 'active').single().then(console.log).catch(console.error);
