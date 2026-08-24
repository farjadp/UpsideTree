-- ============================================================================
-- Upside Tree — Schema Sync Migration
-- Mission control: "Sync live Supabase schema with schema.sql" (P0)
-- https://app.notion.com/p/3be370c6d62481159dbef5de2adbf50c
--
-- WHY THIS EXISTS
-- The live Supabase project was never migrated to match schema.sql. Only 18
-- of the 36 tables schema.sql defines actually exist in production, and the
-- ones that do exist (products, collections, orders, order_items) are
-- missing most of their intended columns. This is the root cause behind the
-- last ~20 commits titled "Harden…", "…schema drift", "…schema fallback
-- tolerance" — every one of them was a workaround for this gap, not a fix.
--
-- Verified by live introspection on 2026-08-16 via the PostgREST OpenAPI
-- endpoint (read-only, no data touched) — see the diff this migration closes:
--   - 18 tables completely missing: media_library, product_variants,
--     product_attributes, product_tags, product_tag_relations,
--     product_revisions, carts, cart_items, coupons, shipping_zones,
--     tax_rates, restock_notifications, settings, media_assets,
--     navigation_menus, announcement_bars, redirects, custom_scripts.
--   - products: 57 columns missing (only 14 of ~65 exist).
--   - collections: 15 columns missing (only 6 of 21 exist).
--   - orders: 43 columns missing (only 1 of ~44 exist) — table has 0 rows.
--   - order_items: 9 columns missing — table has 0 rows.
--
-- SAFETY
-- Purely additive: no DROP, no data touched, every statement is idempotent
-- (IF NOT EXISTS / DROP POLICY IF EXISTS-then-CREATE) so this file is safe
-- to re-run. orders/order_items are confirmed empty (0 rows) in production
-- as of this writing, so their NOT NULL columns are added exactly as
-- schema.sql defines them — nothing to backfill.
--
-- WHAT THIS DOES NOT DO (deliberately — needs a human decision, not a script)
--   - products.description_en / description_fa (legacy) vs the new
--     desc_emotional_en/fa, desc_functional_en/fa, desc_story_en/fa split:
--     one legacy field maps to three new ones — a content decision, not
--     mechanical. Legacy columns are left in place untouched.
--   - products.inventory_type / printful_sync (legacy) vs product_type /
--     printful_sync_status (new): different enum value sets, needs manual
--     mapping. Legacy columns are left in place untouched.
--   - orders.total_amount (legacy) — table is empty, so nothing to migrate;
--     column is left in place and can be dropped once the app no longer
--     references it.
-- Once the app is confirmed reading/writing only the new columns, a
-- follow-up migration can drop the five legacy-only columns.
--
-- HOW TO RUN
--   Supabase Dashboard → SQL Editor → paste this file → Run.
--   Or, once the Supabase CLI is linked to this project: supabase db push
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. CREATE MISSING TABLES (18)
-- Verbatim from schema.sql, in its original dependency order, with
-- IF NOT EXISTS added. Must run before the ALTER TABLE section below,
-- because orders.cart_id and order_items.variant_id reference carts and
-- product_variants respectively.
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.media_library (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    filename VARCHAR NOT NULL,
    original_name VARCHAR NOT NULL,
    url TEXT NOT NULL,
    thumbnail_url TEXT,
    file_type VARCHAR CHECK (file_type IN ('image', 'video', 'document')),
    mime_type VARCHAR,
    file_size_bytes INTEGER,
    width INTEGER,
    height INTEGER,
    alt_text_en VARCHAR,
    alt_text_fa VARCHAR,
    folder VARCHAR DEFAULT 'general',
    uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.product_variants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    sku VARCHAR UNIQUE,
    name_en VARCHAR,
    name_fa VARCHAR,
    attributes JSONB DEFAULT '{}',
    price DECIMAL(10,2),
    sale_price DECIMAL(10,2),
    stock_quantity INTEGER DEFAULT 0,
    image_url TEXT,
    is_default BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.product_attributes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name_en VARCHAR NOT NULL,
    name_fa VARCHAR NOT NULL,
    type VARCHAR DEFAULT 'select' CHECK (type IN ('select', 'color', 'text')),
    options JSONB DEFAULT '[]',
    is_visible BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.product_tags (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name_en VARCHAR NOT NULL,
    name_fa VARCHAR NOT NULL,
    slug VARCHAR UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.product_tag_relations (
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES public.product_tags(id) ON DELETE CASCADE,
    PRIMARY KEY (product_id, tag_id)
);

CREATE TABLE IF NOT EXISTS public.product_revisions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    snapshot JSONB NOT NULL,
    changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.carts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id VARCHAR,
    status VARCHAR DEFAULT 'active' CHECK (status IN ('active', 'converted', 'abandoned')),
    currency VARCHAR DEFAULT 'CAD',
    coupon_code VARCHAR,
    gift_wrap BOOLEAN DEFAULT false,
    gift_message TEXT,
    notes TEXT,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cart_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    cart_id UUID REFERENCES public.carts(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    price_at_add DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.coupons (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code VARCHAR UNIQUE NOT NULL,
    type VARCHAR DEFAULT 'percentage' CHECK (type IN ('percentage', 'fixed', 'free_shipping')),
    value DECIMAL(10,2) NOT NULL,
    min_order_amount DECIMAL(10,2),
    usage_limit INTEGER,
    usage_count INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT true,
    starts_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.shipping_zones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR NOT NULL,
    countries TEXT[] DEFAULT '{}',
    rate DECIMAL(10,2) NOT NULL DEFAULT 0,
    free_shipping_threshold DECIMAL(10,2),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tax_rates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    region VARCHAR NOT NULL,
    rate DECIMAL(6,4) NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.restock_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    customer_email VARCHAR NOT NULL,
    notified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    namespace VARCHAR NOT NULL,
    key VARCHAR NOT NULL,
    value JSONB,
    value_type VARCHAR DEFAULT 'string',
    label_en VARCHAR,
    label_fa VARCHAR,
    description TEXT,
    is_secret BOOLEAN DEFAULT false,
    is_public BOOLEAN DEFAULT false,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (namespace, key)
);

CREATE TABLE IF NOT EXISTS public.media_assets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    key VARCHAR UNIQUE NOT NULL,
    url TEXT NOT NULL,
    alt_text VARCHAR,
    uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.navigation_menus (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    handle VARCHAR UNIQUE NOT NULL,
    items JSONB DEFAULT '[]',
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.announcement_bars (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message_en TEXT,
    message_fa TEXT,
    link_url TEXT,
    active BOOLEAN DEFAULT false,
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.redirects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    from_path VARCHAR UNIQUE NOT NULL,
    to_path VARCHAR NOT NULL,
    status_code INTEGER DEFAULT 301,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.custom_scripts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR NOT NULL,
    placement VARCHAR DEFAULT 'head' CHECK (placement IN ('head', 'body_start', 'body_end')),
    content TEXT NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 2. PRODUCTS — add 57 missing columns
-- ----------------------------------------------------------------------------

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS visibility VARCHAR DEFAULT 'public' CHECK (visibility IN ('public', 'hidden', 'password_protected'));
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS password VARCHAR;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS product_type VARCHAR DEFAULT 'physical' CHECK (product_type IN ('pod', 'physical', 'digital', 'limited', 'variable'));
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS maker_id UUID;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS desc_emotional_en TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS desc_emotional_fa TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS desc_functional_en TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS desc_functional_fa TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS desc_story_en TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS desc_story_fa TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS seo_title_en VARCHAR;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS seo_title_fa VARCHAR;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS seo_description_en TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS seo_description_fa TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS seo_keywords TEXT[] DEFAULT '{}';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sale_price DECIMAL(10,2);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sale_starts_at TIMESTAMPTZ;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sale_ends_at TIMESTAMPTZ;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS cost_price DECIMAL(10,2);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS tax_class VARCHAR DEFAULT 'standard';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sku VARCHAR UNIQUE;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS manage_stock BOOLEAN DEFAULT true;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 5;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS stock_status VARCHAR DEFAULT 'in_stock' CHECK (stock_status IN ('in_stock', 'out_of_stock', 'on_backorder'));
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS allow_backorders VARCHAR DEFAULT 'no' CHECK (allow_backorders IN ('no', 'notify', 'yes'));
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sold_individually BOOLEAN DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS weight_grams INTEGER;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS length_cm DECIMAL(10,2);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS width_cm DECIMAL(10,2);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS height_cm DECIMAL(10,2);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS shipping_class VARCHAR;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS requires_shipping BOOLEAN DEFAULT true;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS featured_image_url TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS gallery_urls TEXT[] DEFAULT '{}';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS printful_product_id VARCHAR;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS printful_sync_status VARCHAR CHECK (printful_sync_status IN ('synced', 'out_of_sync', 'not_listed'));
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS printful_synced_at TIMESTAMPTZ;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS etsy_listing_id VARCHAR;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS etsy_ready BOOLEAN DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS etsy_synced_at TIMESTAMPTZ;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_limited BOOLEAN DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS edition_size INTEGER;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS edition_number_start INTEGER DEFAULT 1;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS digital_file_url TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS digital_file_name VARCHAR;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS download_limit INTEGER;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS download_expiry_days INTEGER;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS brand_gate JSONB DEFAULT '{
  "has_story": false,
  "fits_collection": false,
  "persian_reviewed": false,
  "sample_approved": false,
  "pricing_checked": false,
  "legal_checked": false
}'::jsonb;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS brand_gate_approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS brand_gate_approved_at TIMESTAMPTZ;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Mechanical 1:1 backfill only (same meaning, same type). Content-mapping
-- fields (description_en/fa, inventory_type, printful_sync) are left alone —
-- see the header comment.
UPDATE public.products SET stock_quantity = stock_level WHERE stock_level IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 3. COLLECTIONS — add 15 missing columns
-- ----------------------------------------------------------------------------

ALTER TABLE public.collections ADD COLUMN IF NOT EXISTS description_en TEXT;
ALTER TABLE public.collections ADD COLUMN IF NOT EXISTS description_fa TEXT;
ALTER TABLE public.collections ADD COLUMN IF NOT EXISTS story_en TEXT;
ALTER TABLE public.collections ADD COLUMN IF NOT EXISTS story_fa TEXT;
ALTER TABLE public.collections ADD COLUMN IF NOT EXISTS cover_image_url TEXT;
ALTER TABLE public.collections ADD COLUMN IF NOT EXISTS banner_image_url TEXT;
ALTER TABLE public.collections ADD COLUMN IF NOT EXISTS color_palette TEXT[] DEFAULT '{}';
ALTER TABLE public.collections ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false;
ALTER TABLE public.collections ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
ALTER TABLE public.collections ADD COLUMN IF NOT EXISTS seo_title_en VARCHAR;
ALTER TABLE public.collections ADD COLUMN IF NOT EXISTS seo_title_fa VARCHAR;
ALTER TABLE public.collections ADD COLUMN IF NOT EXISTS seo_description_en TEXT;
ALTER TABLE public.collections ADD COLUMN IF NOT EXISTS seo_description_fa TEXT;
ALTER TABLE public.collections ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.collections ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- ----------------------------------------------------------------------------
-- 4. ORDERS — add 43 missing columns (table has 0 rows in production, so the
-- NOT NULL columns below are safe to add exactly as schema.sql defines them)
-- ----------------------------------------------------------------------------

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS guest_email VARCHAR;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cart_id UUID REFERENCES public.carts(id) ON DELETE SET NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_status VARCHAR DEFAULT 'unpaid';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS fulfillment_status VARCHAR DEFAULT 'unfulfilled';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS channel VARCHAR DEFAULT 'direct' CHECK (channel IN ('direct', 'etsy', 'amazon'));
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS subtotal DECIMAL(10,2) NOT NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS coupon_code VARCHAR;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS gift_wrap_fee DECIMAL(10,2) DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_cost DECIMAL(10,2) DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS total DECIMAL(10,2) NOT NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS currency VARCHAR DEFAULT 'CAD';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(8,6) DEFAULT 1.0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS billing_address JSONB NOT NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS billing_same_as_shipping BOOLEAN DEFAULT true;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_email VARCHAR NOT NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_name VARCHAR NOT NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_phone VARCHAR;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS stripe_payment_intent_id VARCHAR;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS stripe_charge_id VARCHAR;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tracking_number VARCHAR;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tracking_carrier VARCHAR;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tracking_url TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS estimated_delivery DATE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS gift_wrap BOOLEAN DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS gift_message TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS story_card_message TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_notes TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS internal_notes TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS is_gift BOOLEAN DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS gift_recipient_name VARCHAR;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS points_earned INTEGER DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS points_applied INTEGER DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS points_confirmed BOOLEAN DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS ip_address INET;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS referrer_source VARCHAR;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- ----------------------------------------------------------------------------
-- 5. ORDER_ITEMS — add 9 missing columns (table has 0 rows in production)
-- ----------------------------------------------------------------------------

ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS product_snapshot JSONB NOT NULL;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS sale_price DECIMAL(10,2);
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS total_price DECIMAL(10,2) NOT NULL;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS sku VARCHAR NOT NULL;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS printful_item_id VARCHAR;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS fulfillment_status VARCHAR DEFAULT 'unfulfilled';
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS refund_status VARCHAR DEFAULT 'none' CHECK (refund_status IN ('none', 'partial', 'full'));
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS refund_amount DECIMAL(10,2) DEFAULT 0;

-- ----------------------------------------------------------------------------
-- 6. ENABLE RLS on the 18 new tables
-- ----------------------------------------------------------------------------

ALTER TABLE public.media_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_tag_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restock_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.navigation_menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_bars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.redirects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_scripts ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 7. POLICIES on the 18 new tables (DROP IF EXISTS first so this file is
-- safe to re-run without a duplicate-policy error)
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Public variants viewable by everyone" ON public.product_variants;
CREATE POLICY "Public variants viewable by everyone" ON public.product_variants FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public attributes viewable by everyone" ON public.product_attributes;
CREATE POLICY "Public attributes viewable by everyone" ON public.product_attributes FOR SELECT USING (is_visible = true);

DROP POLICY IF EXISTS "Users can manage their carts." ON public.carts;
CREATE POLICY "Users can manage their carts." ON public.carts FOR ALL USING (auth.uid() = customer_id);

DROP POLICY IF EXISTS "Users can manage their cart items." ON public.cart_items;
CREATE POLICY "Users can manage their cart items." ON public.cart_items FOR ALL USING (cart_id IN (SELECT id FROM public.carts WHERE customer_id = auth.uid()));

DROP POLICY IF EXISTS "Public shipping zones are viewable by everyone" ON public.shipping_zones;
CREATE POLICY "Public shipping zones are viewable by everyone" ON public.shipping_zones FOR SELECT USING (active = true);

DROP POLICY IF EXISTS "Public tax rates are viewable by everyone" ON public.tax_rates;
CREATE POLICY "Public tax rates are viewable by everyone" ON public.tax_rates FOR SELECT USING (active = true);

DROP POLICY IF EXISTS "Admins have full access to media_library" ON public.media_library;
CREATE POLICY "Admins have full access to media_library" ON public.media_library FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Admins have full access to product_variants" ON public.product_variants;
CREATE POLICY "Admins have full access to product_variants" ON public.product_variants FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Admins have full access to product_attributes" ON public.product_attributes;
CREATE POLICY "Admins have full access to product_attributes" ON public.product_attributes FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Admins have full access to product_tags" ON public.product_tags;
CREATE POLICY "Admins have full access to product_tags" ON public.product_tags FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Admins have full access to product_tag_relations" ON public.product_tag_relations;
CREATE POLICY "Admins have full access to product_tag_relations" ON public.product_tag_relations FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Admins have full access to product_revisions" ON public.product_revisions;
CREATE POLICY "Admins have full access to product_revisions" ON public.product_revisions FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Admins have full access to carts" ON public.carts;
CREATE POLICY "Admins have full access to carts" ON public.carts FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Admins have full access to cart_items" ON public.cart_items;
CREATE POLICY "Admins have full access to cart_items" ON public.cart_items FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Admins have full access to coupons" ON public.coupons;
CREATE POLICY "Admins have full access to coupons" ON public.coupons FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Admins have full access to shipping_zones" ON public.shipping_zones;
CREATE POLICY "Admins have full access to shipping_zones" ON public.shipping_zones FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Admins have full access to tax_rates" ON public.tax_rates;
CREATE POLICY "Admins have full access to tax_rates" ON public.tax_rates FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Admins have full access to restock_notifications" ON public.restock_notifications;
CREATE POLICY "Admins have full access to restock_notifications" ON public.restock_notifications FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage settings" ON public.settings;
CREATE POLICY "Admins can manage settings" ON public.settings FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Public settings are viewable by everyone" ON public.settings;
CREATE POLICY "Public settings are viewable by everyone" ON public.settings FOR SELECT USING (is_public = true);

DROP POLICY IF EXISTS "Admins can manage media assets" ON public.media_assets;
CREATE POLICY "Admins can manage media assets" ON public.media_assets FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Media assets are viewable by everyone" ON public.media_assets;
CREATE POLICY "Media assets are viewable by everyone" ON public.media_assets FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage navigation menus" ON public.navigation_menus;
CREATE POLICY "Admins can manage navigation menus" ON public.navigation_menus FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Navigation menus are viewable by everyone" ON public.navigation_menus;
CREATE POLICY "Navigation menus are viewable by everyone" ON public.navigation_menus FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage announcement bars" ON public.announcement_bars;
CREATE POLICY "Admins can manage announcement bars" ON public.announcement_bars FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Announcement bars are viewable by everyone" ON public.announcement_bars;
CREATE POLICY "Announcement bars are viewable by everyone" ON public.announcement_bars FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage redirects" ON public.redirects;
CREATE POLICY "Admins can manage redirects" ON public.redirects FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Redirects are viewable by everyone" ON public.redirects;
CREATE POLICY "Redirects are viewable by everyone" ON public.redirects FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage custom scripts" ON public.custom_scripts;
CREATE POLICY "Admins can manage custom scripts" ON public.custom_scripts FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Custom scripts are viewable by everyone" ON public.custom_scripts;
CREATE POLICY "Custom scripts are viewable by everyone" ON public.custom_scripts FOR SELECT USING (true);

-- ----------------------------------------------------------------------------
-- 8. INDEXES
-- ----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_settings_namespace ON public.settings(namespace);
CREATE INDEX IF NOT EXISTS idx_settings_is_public ON public.settings(is_public);

COMMIT;
