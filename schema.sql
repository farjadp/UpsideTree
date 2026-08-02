-- ============================================================================
-- Upside Tree E-Commerce Schema
-- ============================================================================

-- Clean up existing tables to allow safe re-runs
DROP TABLE IF EXISTS public.product_revisions CASCADE;
DROP TABLE IF EXISTS public.product_tag_relations CASCADE;
DROP TABLE IF EXISTS public.product_tags CASCADE;
DROP TABLE IF EXISTS public.product_variants CASCADE;
DROP TABLE IF EXISTS public.product_attributes CASCADE;
DROP TABLE IF EXISTS public.media_library CASCADE;
DROP TABLE IF EXISTS public.security_logs CASCADE;
DROP TABLE IF EXISTS public.system_event_logs CASCADE;
DROP TABLE IF EXISTS public.admin_audit_logs CASCADE;
DROP TABLE IF EXISTS public.custom_scripts CASCADE;
DROP TABLE IF EXISTS public.redirects CASCADE;
DROP TABLE IF EXISTS public.announcement_bars CASCADE;
DROP TABLE IF EXISTS public.navigation_menus CASCADE;
DROP TABLE IF EXISTS public.media_assets CASCADE;
DROP TABLE IF EXISTS public.settings CASCADE;
DROP TABLE IF EXISTS public.user_activity_logs CASCADE;
DROP TABLE IF EXISTS public.loyalty_rules CASCADE;
DROP TABLE IF EXISTS public.loyalty_transactions CASCADE;
DROP TABLE IF EXISTS public.loyalty_accounts CASCADE;
DROP TABLE IF EXISTS public.customer_sessions CASCADE;
DROP TABLE IF EXISTS public.customer_referrals CASCADE;
DROP TABLE IF EXISTS public.customer_reviews CASCADE;
DROP TABLE IF EXISTS public.customer_wishlist CASCADE;
DROP TABLE IF EXISTS public.customer_preferences CASCADE;
DROP TABLE IF EXISTS public.customer_addresses CASCADE;
DROP TABLE IF EXISTS public.order_items CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.carts CASCADE;
DROP TABLE IF EXISTS public.cart_items CASCADE;
DROP TABLE IF EXISTS public.coupons CASCADE;
DROP TABLE IF EXISTS public.shipping_zones CASCADE;
DROP TABLE IF EXISTS public.tax_rates CASCADE;
DROP TABLE IF EXISTS public.restock_notifications CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.collections CASCADE;
DROP TABLE IF EXISTS public.customer_profiles CASCADE;
DROP TABLE IF EXISTS public.customers CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 1. COLLECTIONS
CREATE TABLE public.collections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name_en VARCHAR NOT NULL,
    name_fa VARCHAR NOT NULL,
    slug VARCHAR NOT NULL UNIQUE,
    description_en TEXT,
    description_fa TEXT,
    story_en TEXT,
    story_fa TEXT,
    cover_image_url TEXT,
    banner_image_url TEXT,
    color_palette TEXT[] DEFAULT '{}',
    status VARCHAR DEFAULT 'active' CHECK (status IN ('active', 'archived', 'draft')),
    featured BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    seo_title_en VARCHAR,
    seo_title_fa VARCHAR,
    seo_description_en TEXT,
    seo_description_fa TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. MEDIA LIBRARY
CREATE TABLE public.media_library (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    filename VARCHAR NOT NULL,
    original_name VARCHAR NOT NULL,
    url TEXT NOT NULL,
    thumbnail_url TEXT,
    file_type VARCHAR CHECK (file_type IN ('image', 'video', 'document')),
    mime_type VARCHAR,
    size_bytes INTEGER,
    width INTEGER,
    height INTEGER,
    alt_text_en VARCHAR,
    alt_text_fa VARCHAR,
    caption_en VARCHAR,
    caption_fa VARCHAR,
    folder VARCHAR DEFAULT 'uncategorized',
    tags TEXT[] DEFAULT '{}',
    used_in JSONB DEFAULT '[]'::jsonb,
    uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. PRODUCTS
CREATE TABLE public.products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    slug VARCHAR UNIQUE NOT NULL,
    status VARCHAR DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived', 'scheduled')),
    visibility VARCHAR DEFAULT 'public' CHECK (visibility IN ('public', 'hidden', 'password_protected')),
    password VARCHAR,
    product_type VARCHAR DEFAULT 'physical' CHECK (product_type IN ('pod', 'physical', 'digital', 'limited', 'variable')),
    collection_id UUID REFERENCES public.collections(id) ON DELETE SET NULL,
    maker_id UUID,

    -- Bilingual Naming
    name_en VARCHAR NOT NULL,
    name_fa VARCHAR NOT NULL,

    -- 3-Layer Brand Descriptions
    desc_emotional_en TEXT,
    desc_emotional_fa TEXT,
    desc_functional_en TEXT,
    desc_functional_fa TEXT,
    desc_story_en TEXT,
    desc_story_fa TEXT,

    -- SEO
    seo_title_en VARCHAR,
    seo_title_fa VARCHAR,
    seo_description_en TEXT,
    seo_description_fa TEXT,
    seo_keywords TEXT[] DEFAULT '{}',

    -- Pricing
    price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    sale_price DECIMAL(10,2),
    sale_starts_at TIMESTAMPTZ,
    sale_ends_at TIMESTAMPTZ,
    cost_price DECIMAL(10,2),
    currency VARCHAR DEFAULT 'CAD',
    tax_class VARCHAR DEFAULT 'standard',

    -- Inventory
    sku VARCHAR UNIQUE,
    manage_stock BOOLEAN DEFAULT true,
    stock_quantity INTEGER DEFAULT 0,
    low_stock_threshold INTEGER DEFAULT 5,
    stock_status VARCHAR DEFAULT 'in_stock' CHECK (stock_status IN ('in_stock', 'out_of_stock', 'on_backorder')),
    allow_backorders VARCHAR DEFAULT 'no' CHECK (allow_backorders IN ('no', 'notify', 'yes')),
    sold_individually BOOLEAN DEFAULT false,

    -- Shipping
    weight_grams INTEGER,
    length_cm DECIMAL(10,2),
    width_cm DECIMAL(10,2),
    height_cm DECIMAL(10,2),
    shipping_class VARCHAR,
    requires_shipping BOOLEAN DEFAULT true,

    -- Media
    featured_image_url TEXT,
    gallery_urls TEXT[] DEFAULT '{}',
    video_url TEXT,

    -- POD (Printful)
    printful_product_id VARCHAR,
    printful_sync_status VARCHAR CHECK (printful_sync_status IN ('synced', 'out_of_sync', 'not_listed')),
    printful_synced_at TIMESTAMPTZ,

    -- Etsy
    etsy_listing_id VARCHAR,
    etsy_ready BOOLEAN DEFAULT false,
    etsy_synced_at TIMESTAMPTZ,

    -- Limited Edition
    is_limited BOOLEAN DEFAULT false,
    edition_size INTEGER,
    edition_number_start INTEGER DEFAULT 1,

    -- Digital
    digital_file_url TEXT,
    digital_file_name VARCHAR,
    download_limit INTEGER,
    download_expiry_days INTEGER,

    -- Brand Gate
    brand_gate JSONB DEFAULT '{
      "has_story": false,
      "fits_collection": false,
      "persian_reviewed": false,
      "sample_approved": false,
      "pricing_checked": false,
      "legal_checked": false
    }'::jsonb,
    brand_gate_approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    brand_gate_approved_at TIMESTAMPTZ,

    -- Publishing & Ownership
    published_at TIMESTAMPTZ,
    scheduled_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. PRODUCT VARIANTS
CREATE TABLE public.product_variants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    sku VARCHAR UNIQUE,
    name_en VARCHAR NOT NULL,
    name_fa VARCHAR,
    attributes JSONB DEFAULT '{}'::jsonb,
    price DECIMAL(10,2),
    sale_price DECIMAL(10,2),
    cost_price DECIMAL(10,2),
    stock_quantity INTEGER,
    stock_status VARCHAR DEFAULT 'in_stock' CHECK (stock_status IN ('in_stock', 'out_of_stock', 'on_backorder')),
    weight_grams INTEGER,
    image_url TEXT,
    printful_variant_id VARCHAR,
    is_default BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. PRODUCT ATTRIBUTES
CREATE TABLE public.product_attributes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name_en VARCHAR NOT NULL,
    name_fa VARCHAR NOT NULL,
    slug VARCHAR UNIQUE NOT NULL,
    type VARCHAR CHECK (type IN ('select', 'color', 'text', 'number')),
    values JSONB DEFAULT '[]'::jsonb,
    is_visible BOOLEAN DEFAULT true,
    is_variation BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0
);

-- 6. PRODUCT TAGS & TAG RELATIONS
CREATE TABLE public.product_tags (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name_en VARCHAR UNIQUE NOT NULL,
    name_fa VARCHAR,
    slug VARCHAR UNIQUE NOT NULL,
    count INTEGER DEFAULT 0
);

CREATE TABLE public.product_tag_relations (
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    tag_id UUID REFERENCES public.product_tags(id) ON DELETE CASCADE NOT NULL,
    PRIMARY KEY (product_id, tag_id)
);

-- 7. PRODUCT REVISIONS
CREATE TABLE public.product_revisions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    revision_data JSONB NOT NULL,
    saved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    saved_at TIMESTAMPTZ DEFAULT now(),
    note VARCHAR
);

-- 8. Customer Profiles (Identity & RBAC)
CREATE TABLE public.customer_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR UNIQUE NOT NULL,
    first_name VARCHAR,
    last_name VARCHAR,
    display_name VARCHAR,
    avatar_url TEXT,
    phone VARCHAR,
    phone_verified BOOLEAN DEFAULT false,
    birth_date DATE,
    birth_year INTEGER,
    gender VARCHAR,
    preferred_language VARCHAR DEFAULT 'en',
    preferred_currency VARCHAR DEFAULT 'CAD',
    bio TEXT,
    is_iranian_diaspora BOOLEAN DEFAULT false,
    account_status VARCHAR DEFAULT 'active',
    email_verified BOOLEAN DEFAULT false,
    role VARCHAR DEFAULT 'CUSTOMER', -- 'ADMIN' or 'CUSTOMER'
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    last_login_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ
);

-- 9. Customer Addresses
CREATE TABLE public.customer_addresses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID REFERENCES public.customer_profiles(id) ON DELETE CASCADE NOT NULL,
    label VARCHAR,
    is_default BOOLEAN DEFAULT false,
    first_name VARCHAR NOT NULL,
    last_name VARCHAR NOT NULL,
    company VARCHAR,
    address_line_1 VARCHAR NOT NULL,
    address_line_2 VARCHAR,
    city VARCHAR NOT NULL,
    province_state VARCHAR NOT NULL,
    postal_code VARCHAR NOT NULL,
    country VARCHAR DEFAULT 'CA',
    phone VARCHAR,
    delivery_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Trigger for default address
CREATE OR REPLACE FUNCTION public.handle_default_address()
RETURNS trigger AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE public.customer_addresses
    SET is_default = false
    WHERE customer_id = NEW.customer_id AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_address_set_default
  BEFORE INSERT OR UPDATE OF is_default ON public.customer_addresses
  FOR EACH ROW
  WHEN (NEW.is_default = true)
  EXECUTE PROCEDURE public.handle_default_address();

-- 10. Customer Preferences
CREATE TABLE public.customer_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID UNIQUE REFERENCES public.customer_profiles(id) ON DELETE CASCADE NOT NULL,
    email_order_updates BOOLEAN DEFAULT true,
    email_shipping_updates BOOLEAN DEFAULT true,
    email_new_collections BOOLEAN DEFAULT true,
    email_story_posts BOOLEAN DEFAULT false,
    email_nowruz_campaign BOOLEAN DEFAULT true,
    email_yalda_campaign BOOLEAN DEFAULT true,
    email_promotions BOOLEAN DEFAULT true,
    push_order_updates BOOLEAN DEFAULT true,
    push_new_collections BOOLEAN DEFAULT false,
    push_back_in_stock BOOLEAN DEFAULT true,
    push_points_earned BOOLEAN DEFAULT true,
    sms_order_updates BOOLEAN DEFAULT false,
    sms_promotions BOOLEAN DEFAULT false,
    preferred_collections TEXT[] DEFAULT '{}',
    preferred_product_types TEXT[] DEFAULT '{}',
    gift_recipient BOOLEAN DEFAULT false,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 11. Customer Wishlist
CREATE TABLE public.customer_wishlist (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID REFERENCES public.customer_profiles(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    added_at TIMESTAMPTZ DEFAULT now(),
    note TEXT,
    UNIQUE(customer_id, product_id)
);

-- 12. Carts
CREATE TABLE public.carts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID REFERENCES public.customer_profiles(id) ON DELETE SET NULL,
    session_id UUID,
    status VARCHAR DEFAULT 'active' CHECK (status IN ('active', 'merged', 'abandoned', 'converted')),
    currency VARCHAR DEFAULT 'CAD',
    coupon_code VARCHAR,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    gift_wrap BOOLEAN DEFAULT false,
    gift_message TEXT, -- max 150 chars
    notes TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 13. Cart Items
CREATE TABLE public.cart_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    cart_id UUID REFERENCES public.carts(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
    quantity INTEGER DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    sale_price DECIMAL(10,2),
    product_snapshot JSONB NOT NULL,
    added_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 14. Orders
CREATE TABLE public.orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_number VARCHAR UNIQUE NOT NULL,
    customer_id UUID REFERENCES public.customer_profiles(id) ON DELETE SET NULL,
    guest_email VARCHAR,
    cart_id UUID REFERENCES public.carts(id) ON DELETE SET NULL,
    
    -- Statuses
    status VARCHAR DEFAULT 'pending_payment' 
      CHECK (status IN ('pending_payment', 'payment_failed', 'processing', 'on_hold', 'completed', 'cancelled', 'refunded', 'partially_refunded')),
    payment_status VARCHAR DEFAULT 'unpaid' 
      CHECK (payment_status IN ('unpaid', 'paid', 'partially_paid', 'refunded', 'partially_refunded')),
    fulfillment_status VARCHAR DEFAULT 'unfulfilled' 
      CHECK (fulfillment_status IN ('unfulfilled', 'in_production', 'partially_fulfilled', 'fulfilled')),
    channel VARCHAR DEFAULT 'direct' CHECK (channel IN ('direct', 'etsy', 'amazon')),

    -- Pricing snapshot
    subtotal DECIMAL(10,2) NOT NULL,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    coupon_code VARCHAR,
    gift_wrap_fee DECIMAL(10,2) DEFAULT 0,
    shipping_cost DECIMAL(10,2) DEFAULT 0,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) NOT NULL,
    currency VARCHAR DEFAULT 'CAD',
    exchange_rate DECIMAL(8,6) DEFAULT 1.0,

    -- Addresses
    shipping_address JSONB NOT NULL,
    billing_address JSONB NOT NULL,
    billing_same_as_shipping BOOLEAN DEFAULT true,

    -- Customer Info Snapshot
    customer_email VARCHAR NOT NULL,
    customer_name VARCHAR NOT NULL,
    customer_phone VARCHAR,

    -- Payment
    payment_method VARCHAR,
    stripe_payment_intent_id VARCHAR,
    stripe_charge_id VARCHAR,
    paid_at TIMESTAMPTZ,

    -- Fulfillment
    printful_order_id VARCHAR,
    tracking_number VARCHAR,
    tracking_carrier VARCHAR,
    tracking_url TEXT,
    shipped_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    estimated_delivery DATE,

    -- Extras
    gift_wrap BOOLEAN DEFAULT false,
    gift_message TEXT,
    story_card_message TEXT,
    order_notes TEXT,
    internal_notes TEXT,
    
    -- Gift
    is_gift BOOLEAN DEFAULT false,
    gift_recipient_name VARCHAR,

    -- Loyalty
    points_earned INTEGER DEFAULT 0,
    points_applied INTEGER DEFAULT 0,
    points_confirmed BOOLEAN DEFAULT false,

    -- Metadata
    ip_address INET,
    user_agent TEXT,
    referrer_source VARCHAR,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 15. Order Items
CREATE TABLE public.order_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
    product_snapshot JSONB NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    sale_price DECIMAL(10,2),
    total_price DECIMAL(10,2) NOT NULL,
    sku VARCHAR NOT NULL,
    printful_item_id VARCHAR,
    fulfillment_status VARCHAR DEFAULT 'unfulfilled'
      CHECK (fulfillment_status IN ('unfulfilled', 'in_production', 'partially_fulfilled', 'fulfilled')),
    refund_status VARCHAR DEFAULT 'none' CHECK (refund_status IN ('none', 'partial', 'full')),
    refund_amount DECIMAL(10,2) DEFAULT 0
);

-- 16. Coupons
CREATE TABLE public.coupons (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code VARCHAR UNIQUE NOT NULL,
    type VARCHAR NOT NULL CHECK (type IN ('percentage', 'fixed', 'free_shipping', 'buy_x_get_y')),
    value DECIMAL(10,2) NOT NULL,
    minimum_order DECIMAL(10,2),
    maximum_discount DECIMAL(10,2),
    collection_scope UUID[],
    product_scope UUID[],
    usage_limit INTEGER,
    usage_per_customer INTEGER,
    usage_count INTEGER DEFAULT 0,
    customer_scope UUID[],
    starts_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 17. Shipping Zones
CREATE TABLE public.shipping_zones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR NOT NULL,
    countries TEXT[] NOT NULL,
    rates JSONB NOT NULL,
    active BOOLEAN DEFAULT true
);

-- 18. Tax Rates
CREATE TABLE public.tax_rates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    country VARCHAR DEFAULT 'CA',
    province VARCHAR,
    tax_name VARCHAR NOT NULL,
    rate DECIMAL(5,4) NOT NULL,
    compound BOOLEAN DEFAULT false,
    active BOOLEAN DEFAULT true
);

-- 19. Restock Notifications
CREATE TABLE public.restock_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    variant_id UUID REFERENCES public.product_variants(id) ON DELETE CASCADE,
    email VARCHAR NOT NULL,
    customer_id UUID REFERENCES public.customer_profiles(id) ON DELETE SET NULL,
    notified BOOLEAN DEFAULT false,
    notified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 14. Customer Reviews
CREATE TABLE public.customer_reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID REFERENCES public.customer_profiles(id) ON DELETE CASCADE NOT NULL,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR,
    body TEXT,
    photos TEXT[], -- max 5 URLs
    language VARCHAR,
    verified_purchase BOOLEAN DEFAULT true,
    helpful_count INTEGER DEFAULT 0,
    status VARCHAR DEFAULT 'pending', -- pending/approved/rejected
    admin_note TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 15. Customer Referrals
CREATE TABLE public.customer_referrals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    referrer_id UUID REFERENCES public.customer_profiles(id) ON DELETE CASCADE NOT NULL,
    referred_email VARCHAR NOT NULL,
    referred_customer_id UUID REFERENCES public.customer_profiles(id) ON DELETE SET NULL,
    status VARCHAR DEFAULT 'pending', -- pending/signed_up/purchased
    referral_code VARCHAR UNIQUE NOT NULL,
    points_awarded BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    converted_at TIMESTAMPTZ
);

-- 16. Customer Sessions
CREATE TABLE public.customer_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID REFERENCES public.customer_profiles(id) ON DELETE CASCADE NOT NULL,
    device_type VARCHAR,
    browser VARCHAR,
    os VARCHAR,
    ip_hashed VARCHAR,
    country VARCHAR,
    last_active_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    is_current BOOLEAN DEFAULT true
);

-- 17. Loyalty System: Accounts
CREATE TABLE public.loyalty_accounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID REFERENCES public.customer_profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
    total_points_earned INTEGER DEFAULT 0 NOT NULL,
    current_balance INTEGER DEFAULT 0 NOT NULL,
    tier TEXT DEFAULT 'Seed', -- Seed / Branch / Root / Canopy
    tier_updated_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 18. Loyalty System: Transactions
CREATE TABLE public.loyalty_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID REFERENCES public.customer_profiles(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL, -- earn / redeem / expire / adjust / bonus
    points INTEGER NOT NULL,
    reason TEXT NOT NULL,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 19. Loyalty System: Rules
CREATE TABLE public.loyalty_rules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    rule_name TEXT NOT NULL,
    trigger_event TEXT NOT NULL UNIQUE,
    points_awarded INTEGER NOT NULL,
    multiplier DECIMAL(3,1) DEFAULT 1.0,
    collection_scope UUID REFERENCES public.collections(id) ON DELETE SET NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_tag_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_wishlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restock_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_rules ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.customer_profiles
    WHERE id = auth.uid() AND role = 'ADMIN'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Public Access Policies
CREATE POLICY "Public products viewable by everyone" ON public.products FOR SELECT USING (status = 'active' AND visibility = 'public');
CREATE POLICY "Public collections viewable by everyone" ON public.collections FOR SELECT USING (status = 'active');
CREATE POLICY "Public variants viewable by everyone" ON public.product_variants FOR SELECT USING (true);
CREATE POLICY "Public attributes viewable by everyone" ON public.product_attributes FOR SELECT USING (is_visible = true);
CREATE POLICY "Public reviews are viewable by everyone" ON public.customer_reviews FOR SELECT USING (status = 'approved');

-- Customers can view/update their own data
CREATE POLICY "Users can view their own profile." ON public.customer_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile." ON public.customer_profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view their own addresses." ON public.customer_addresses FOR SELECT USING (auth.uid() = customer_id);
CREATE POLICY "Users can modify their own addresses." ON public.customer_addresses FOR ALL USING (auth.uid() = customer_id);

CREATE POLICY "Users can view their own preferences." ON public.customer_preferences FOR SELECT USING (auth.uid() = customer_id);
CREATE POLICY "Users can modify their own preferences." ON public.customer_preferences FOR ALL USING (auth.uid() = customer_id);

CREATE POLICY "Users can view their own wishlist." ON public.customer_wishlist FOR SELECT USING (auth.uid() = customer_id);
CREATE POLICY "Users can modify their own wishlist." ON public.customer_wishlist FOR ALL USING (auth.uid() = customer_id);

CREATE POLICY "Users can view their own reviews." ON public.customer_reviews FOR SELECT USING (auth.uid() = customer_id);
CREATE POLICY "Users can insert their own reviews." ON public.customer_reviews FOR INSERT WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Users can view their own referrals." ON public.customer_referrals FOR SELECT USING (auth.uid() = referrer_id);
CREATE POLICY "Users can view their own sessions." ON public.customer_sessions FOR SELECT USING (auth.uid() = customer_id);

CREATE POLICY "Customers can view their own loyalty account." ON public.loyalty_accounts FOR SELECT USING (auth.uid() = customer_id);
CREATE POLICY "Customers can view their own transactions." ON public.loyalty_transactions FOR SELECT USING (auth.uid() = customer_id);

CREATE POLICY "Users can view their own orders." ON public.orders FOR SELECT USING (auth.uid() = customer_id);
CREATE POLICY "Users can view their own order_items." ON public.order_items FOR SELECT USING (order_id IN (SELECT id FROM public.orders WHERE customer_id = auth.uid()));

CREATE POLICY "Users can manage their carts." ON public.carts FOR ALL USING (auth.uid() = customer_id);
CREATE POLICY "Users can manage their cart items." ON public.cart_items FOR ALL USING (cart_id IN (SELECT id FROM public.carts WHERE customer_id = auth.uid()));

CREATE POLICY "Public shipping zones are viewable by everyone" ON public.shipping_zones FOR SELECT USING (active = true);
CREATE POLICY "Public tax rates are viewable by everyone" ON public.tax_rates FOR SELECT USING (active = true);

-- Admins Full Access
CREATE POLICY "Admins have full access to collections" ON public.collections FOR ALL USING (public.is_admin());
CREATE POLICY "Admins have full access to media_library" ON public.media_library FOR ALL USING (public.is_admin());
CREATE POLICY "Admins have full access to products" ON public.products FOR ALL USING (public.is_admin());
CREATE POLICY "Admins have full access to product_variants" ON public.product_variants FOR ALL USING (public.is_admin());
CREATE POLICY "Admins have full access to product_attributes" ON public.product_attributes FOR ALL USING (public.is_admin());
CREATE POLICY "Admins have full access to product_tags" ON public.product_tags FOR ALL USING (public.is_admin());
CREATE POLICY "Admins have full access to product_tag_relations" ON public.product_tag_relations FOR ALL USING (public.is_admin());
CREATE POLICY "Admins have full access to product_revisions" ON public.product_revisions FOR ALL USING (public.is_admin());
CREATE POLICY "Admins have full access to customer_profiles" ON public.customer_profiles FOR ALL USING (public.is_admin());
CREATE POLICY "Admins have full access to customer_addresses" ON public.customer_addresses FOR ALL USING (public.is_admin());
CREATE POLICY "Admins have full access to customer_preferences" ON public.customer_preferences FOR ALL USING (public.is_admin());
CREATE POLICY "Admins have full access to customer_wishlist" ON public.customer_wishlist FOR ALL USING (public.is_admin());
CREATE POLICY "Admins have full access to customer_reviews" ON public.customer_reviews FOR ALL USING (public.is_admin());
CREATE POLICY "Admins have full access to customer_referrals" ON public.customer_referrals FOR ALL USING (public.is_admin());
CREATE POLICY "Admins have full access to customer_sessions" ON public.customer_sessions FOR ALL USING (public.is_admin());
CREATE POLICY "Admins have full access to orders" ON public.orders FOR ALL USING (public.is_admin());
CREATE POLICY "Admins have full access to order_items" ON public.order_items FOR ALL USING (public.is_admin());
CREATE POLICY "Admins have full access to carts" ON public.carts FOR ALL USING (public.is_admin());
CREATE POLICY "Admins have full access to cart_items" ON public.cart_items FOR ALL USING (public.is_admin());
CREATE POLICY "Admins have full access to coupons" ON public.coupons FOR ALL USING (public.is_admin());
CREATE POLICY "Admins have full access to shipping_zones" ON public.shipping_zones FOR ALL USING (public.is_admin());
CREATE POLICY "Admins have full access to tax_rates" ON public.tax_rates FOR ALL USING (public.is_admin());
CREATE POLICY "Admins have full access to restock_notifications" ON public.restock_notifications FOR ALL USING (public.is_admin());
CREATE POLICY "Admins have full access to loyalty_accounts" ON public.loyalty_accounts FOR ALL USING (public.is_admin());
CREATE POLICY "Admins have full access to loyalty_transactions" ON public.loyalty_transactions FOR ALL USING (public.is_admin());
CREATE POLICY "Admins have full access to loyalty_rules" ON public.loyalty_rules FOR ALL USING (public.is_admin());

-- Trigger for New User Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.customer_profiles (id, email, role, first_name, last_name)
  VALUES (
    new.id, 
    new.email,
    CASE WHEN (SELECT count(*) FROM public.customer_profiles) = 0 THEN 'ADMIN' ELSE 'CUSTOMER' END,
    COALESCE(new.raw_user_meta_data->>'first_name', ''),
    COALESCE(new.raw_user_meta_data->>'last_name', '')
  );
  
  INSERT INTO public.customer_preferences (customer_id)
  VALUES (new.id);
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 20. Logging: User Activity
CREATE TABLE public.user_activity_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID,
    customer_id UUID REFERENCES public.customer_profiles(id) ON DELETE SET NULL,
    event_type VARCHAR NOT NULL,
    event_category VARCHAR NOT NULL,
    page_url TEXT,
    referrer_url TEXT,
    device_type VARCHAR,
    browser VARCHAR,
    os VARCHAR,
    ip_address TEXT,
    country VARCHAR,
    region VARCHAR,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_user_activity_customer ON public.user_activity_logs(customer_id, event_type, created_at, session_id);

-- 21. Logging: Admin Audit
CREATE TABLE public.admin_audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    admin_email VARCHAR,
    admin_role VARCHAR,
    action_type VARCHAR NOT NULL,
    action_category VARCHAR NOT NULL,
    target_table VARCHAR,
    target_id UUID,
    target_label VARCHAR,
    old_value JSONB,
    new_value JSONB,
    ip_address TEXT,
    user_agent TEXT,
    session_id UUID,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_admin_audit_user ON public.admin_audit_logs(admin_user_id, action_type, target_table, created_at);

-- 22. Logging: System Events
CREATE TABLE public.system_event_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    service VARCHAR NOT NULL,
    event_type VARCHAR NOT NULL,
    severity VARCHAR NOT NULL,
    status VARCHAR NOT NULL,
    trigger_source VARCHAR,
    related_order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    related_customer_id UUID REFERENCES public.customer_profiles(id) ON DELETE SET NULL,
    related_product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    request_payload JSONB,
    response_payload JSONB,
    error_code VARCHAR,
    error_message TEXT,
    duration_ms INTEGER,
    retry_count INTEGER DEFAULT 0,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_system_events_service ON public.system_event_logs(service, severity, status, created_at, related_order_id);

-- 23. Logging: Security
CREATE TABLE public.security_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    actor_type VARCHAR NOT NULL,
    actor_id UUID,
    actor_email VARCHAR,
    event_type VARCHAR NOT NULL,
    severity VARCHAR NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    location_country VARCHAR,
    success BOOLEAN,
    failure_reason VARCHAR,
    blocked BOOLEAN DEFAULT false,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_security_logs_actor ON public.security_logs(actor_id, event_type, ip_address, created_at, severity);

-- ============================================================================
-- ADMIN SETTINGS SCHEMA ADDITIONS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- SETTINGS
-- ----------------------------------------------------------------------------
CREATE TABLE public.settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    namespace VARCHAR NOT NULL CHECK (namespace IN ('general', 'branding', 'seo', 'payments', 'shipping', 'email', 'tax', 'integrations', 'security', 'advanced')),
    key VARCHAR NOT NULL,
    value TEXT, -- JSON-serialized for complex values
    value_type VARCHAR NOT NULL CHECK (value_type IN ('string', 'number', 'boolean', 'json', 'secret', 'file_url')),
    label_en VARCHAR NOT NULL,
    label_fa VARCHAR,
    description VARCHAR,
    is_secret BOOLEAN DEFAULT false,
    is_public BOOLEAN DEFAULT false,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (namespace, key)
);

CREATE INDEX idx_settings_namespace ON public.settings(namespace);
CREATE INDEX idx_settings_is_public ON public.settings(is_public);

-- ----------------------------------------------------------------------------
-- MEDIA ASSETS
-- ----------------------------------------------------------------------------
CREATE TABLE public.media_assets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    asset_type VARCHAR NOT NULL,
    url TEXT NOT NULL,
    width INTEGER,
    height INTEGER,
    file_size INTEGER,
    mime_type VARCHAR,
    alt_en VARCHAR,
    alt_fa VARCHAR,
    uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    uploaded_at TIMESTAMPTZ DEFAULT now(),
    is_active BOOLEAN DEFAULT true
);

-- ----------------------------------------------------------------------------
-- NAVIGATION MENUS
-- ----------------------------------------------------------------------------
CREATE TABLE public.navigation_menus (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    location VARCHAR NOT NULL UNIQUE CHECK (location IN ('header_main', 'header_secondary', 'footer_collections', 'footer_company', 'footer_legal', 'mobile_bottom', 'account_sidebar')),
    label_en VARCHAR NOT NULL,
    label_fa VARCHAR NOT NULL,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- ANNOUNCEMENT BARS
-- ----------------------------------------------------------------------------
CREATE TABLE public.announcement_bars (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    text_en VARCHAR NOT NULL,
    text_fa VARCHAR NOT NULL,
    link_url TEXT,
    link_text_en VARCHAR,
    link_text_fa VARCHAR,
    bg_color VARCHAR DEFAULT '#1D4E89',
    text_color VARCHAR DEFAULT '#F4EFE3',
    is_active BOOLEAN DEFAULT false,
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    is_dismissible BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- REDIRECTS
-- ----------------------------------------------------------------------------
CREATE TABLE public.redirects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    from_path VARCHAR UNIQUE NOT NULL,
    to_path VARCHAR NOT NULL,
    type INTEGER NOT NULL CHECK (type IN (301, 302)),
    hits INTEGER DEFAULT 0,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- CUSTOM SCRIPTS
-- ----------------------------------------------------------------------------
CREATE TABLE public.custom_scripts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR NOT NULL,
    location VARCHAR NOT NULL CHECK (location IN ('head', 'body_start', 'body_end')),
    script TEXT NOT NULL,
    is_active BOOLEAN DEFAULT false,
    pages TEXT[] DEFAULT ARRAY['all'],
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for settings tables
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.navigation_menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_bars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.redirects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_scripts ENABLE ROW LEVEL SECURITY;

-- Settings Policies
CREATE POLICY "Admins can manage settings" ON public.settings FOR ALL USING (public.is_admin());
CREATE POLICY "Public settings are viewable by everyone" ON public.settings FOR SELECT USING (is_public = true);

-- Media Assets Policies
CREATE POLICY "Admins can manage media assets" ON public.media_assets FOR ALL USING (public.is_admin());
CREATE POLICY "Media assets are viewable by everyone" ON public.media_assets FOR SELECT USING (true);

-- Navigation Menus Policies
CREATE POLICY "Admins can manage navigation menus" ON public.navigation_menus FOR ALL USING (public.is_admin());
CREATE POLICY "Navigation menus are viewable by everyone" ON public.navigation_menus FOR SELECT USING (true);

-- Announcement Bars Policies
CREATE POLICY "Admins can manage announcement bars" ON public.announcement_bars FOR ALL USING (public.is_admin());
CREATE POLICY "Announcement bars are viewable by everyone" ON public.announcement_bars FOR SELECT USING (true);

-- Redirects Policies
CREATE POLICY "Admins can manage redirects" ON public.redirects FOR ALL USING (public.is_admin());
CREATE POLICY "Redirects are viewable by everyone" ON public.redirects FOR SELECT USING (true);

-- Custom Scripts Policies
CREATE POLICY "Admins can manage custom scripts" ON public.custom_scripts FOR ALL USING (public.is_admin());
CREATE POLICY "Custom scripts are viewable by everyone" ON public.custom_scripts FOR SELECT USING (true);


-- Enable RLS for Log Tables
ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_event_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;

-- Log Table Policies
CREATE POLICY "Admins can view user activity logs" ON public.user_activity_logs FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins can view admin audit logs" ON public.admin_audit_logs FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins can view system event logs" ON public.system_event_logs FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins can view security logs" ON public.security_logs FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins can update system event logs" ON public.system_event_logs FOR UPDATE USING (public.is_admin());
