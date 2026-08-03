"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ExternalLink, Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RichTextEditor } from "@/components/admin/RichTextEditor";

type ProductAttributeValue = {
  label_en: string;
  label_fa?: string;
  color_hex?: string;
};

type ProductAttribute = {
  id: string;
  name_en: string;
  name_fa: string;
  slug: string;
  type: "select" | "color" | "text" | "number";
  values: ProductAttributeValue[];
  is_visible: boolean;
  is_variation: boolean;
};

type ProductVariantRecord = {
  id?: string;
  sku?: string | null;
  name_en?: string | null;
  name_fa?: string | null;
  attributes?: Record<string, string> | null;
  color?: string | null;
  size?: string | null;
  price?: number | string | null;
  sale_price?: number | string | null;
  stock_quantity?: number | null;
  image_url?: string | null;
  is_default?: boolean | null;
  is_active?: boolean | null;
};

type ProductRecord = {
  id?: string;
  name_en?: string | null;
  name_fa?: string | null;
  slug?: string | null;
  status?: string | null;
  visibility?: string | null;
  product_type?: string | null;
  collection_id?: string | null;
  price?: number | string | null;
  sale_price?: number | string | null;
  cost_price?: number | string | null;
  sku?: string | null;
  manage_stock?: boolean | null;
  stock_quantity?: number | null;
  desc_emotional_en?: string | null;
  desc_emotional_fa?: string | null;
  desc_functional_en?: string | null;
  desc_functional_fa?: string | null;
  desc_story_en?: string | null;
  desc_story_fa?: string | null;
  featured_image_url?: string | null;
  gallery_urls?: string[] | null;
  brand_gate?: Record<string, boolean> | null;
};

type CollectionRecord = {
  id: string;
  name_en: string;
  name_fa?: string | null;
};

type AssignedAttribute = {
  attributeId: string;
  name_en: string;
  name_fa: string;
  slug: string;
  type: ProductAttribute["type"];
  values: ProductAttributeValue[];
  selectedValues: string[];
  visibleOnProductPage: boolean;
  useForVariations: boolean;
};

type VariantDraft = {
  id?: string;
  tempId: string;
  attributes: Record<string, string>;
  sku: string;
  price: string;
  sale_price: string;
  stock_quantity: string;
  image_url: string;
  is_default: boolean;
  is_active: boolean;
};

type ProductEditorFormProps = {
  mode: "create" | "edit";
  product?: ProductRecord | null;
  variants?: ProductVariantRecord[];
  attributes: ProductAttribute[];
  collections: CollectionRecord[];
};

const EMPTY_BRAND_GATE = {
  has_story: false,
  fits_collection: false,
  persian_reviewed: false,
  sample_approved: false,
  pricing_checked: false,
  legal_checked: false,
};

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
}

function titleCase(value: string) {
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function variantKey(attributes: Record<string, string>) {
  return Object.entries(attributes)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}:${value}`)
    .join("|");
}

function cartesianProduct<T>(groups: T[][]): T[][] {
  return groups.reduce<T[][]>(
    (accumulator, group) => accumulator.flatMap((current) => group.map((item) => [...current, item])),
    [[]]
  );
}

function normalizeVariantAttributes(variant: ProductVariantRecord) {
  const normalized = { ...(variant.attributes || {}) } as Record<string, string>;

  if (!normalized.color && variant.color) {
    normalized.color = variant.color;
  }

  if (!normalized.size && variant.size) {
    normalized.size = variant.size;
  }

  return normalized;
}

function buildAssignedAttributes(
  globalAttributes: ProductAttribute[],
  initialVariants: ProductVariantRecord[]
) {
  const bySlug = new Map(globalAttributes.map((attribute) => [attribute.slug, attribute]));
  const discovered = new Map<string, AssignedAttribute>();

  for (const variant of initialVariants) {
    const attrs = normalizeVariantAttributes(variant);
    for (const [slug, value] of Object.entries(attrs)) {
      const existing = discovered.get(slug);
      if (existing) {
        if (value && !existing.selectedValues.includes(value)) {
          existing.selectedValues.push(value);
        }
        continue;
      }

      const global = bySlug.get(slug);
      discovered.set(slug, {
        attributeId: global?.id || slug,
        name_en: global?.name_en || titleCase(slug),
        name_fa: global?.name_fa || titleCase(slug),
        slug,
        type: global?.type || "select",
        values:
          global?.values?.length
            ? global.values
            : [{ label_en: value, label_fa: value }],
        selectedValues: value ? [value] : [],
        visibleOnProductPage: true,
        useForVariations: true,
      });
    }
  }

  return Array.from(discovered.values());
}

function buildInitialVariants(initialVariants: ProductVariantRecord[]) {
  return initialVariants.map((variant, index) => ({
    id: variant.id,
    tempId: variant.id || `existing-${index}`,
    attributes: normalizeVariantAttributes(variant),
    sku: variant.sku || "",
    price: variant.price != null ? String(variant.price) : "",
    sale_price: variant.sale_price != null ? String(variant.sale_price) : "",
    stock_quantity: variant.stock_quantity != null ? String(variant.stock_quantity) : "0",
    image_url: variant.image_url || "",
    is_default: Boolean(variant.is_default),
    is_active: variant.is_active !== false,
  }));
}

export function ProductEditorForm({
  mode,
  product,
  variants = [],
  attributes,
  collections,
}: ProductEditorFormProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [attributeToAdd, setAttributeToAdd] = useState("");

  const [nameEn, setNameEn] = useState(product?.name_en || "");
  const [nameFa, setNameFa] = useState(product?.name_fa || "");
  const [slug, setSlug] = useState(product?.slug || "");
  const [status, setStatus] = useState(product?.status || "draft");
  const [visibility, setVisibility] = useState(product?.visibility || "public");
  const [productType, setProductType] = useState(product?.product_type || "physical");
  const [collectionId, setCollectionId] = useState(product?.collection_id || "");
  const [price, setPrice] = useState(product?.price != null ? String(product.price) : "");
  const [salePrice, setSalePrice] = useState(product?.sale_price != null ? String(product.sale_price) : "");
  const [costPrice, setCostPrice] = useState(product?.cost_price != null ? String(product.cost_price) : "");
  const [sku, setSku] = useState(product?.sku || "");
  const [manageStock, setManageStock] = useState(product?.manage_stock ?? true);
  const [stockQuantity, setStockQuantity] = useState(product?.stock_quantity ?? 0);
  const [featuredImageUrl, setFeaturedImageUrl] = useState(product?.featured_image_url || "");
  const [galleryText, setGalleryText] = useState((product?.gallery_urls || []).join("\n"));

  const [descEmotionalEn, setDescEmotionalEn] = useState(product?.desc_emotional_en || "");
  const [descEmotionalFa, setDescEmotionalFa] = useState(product?.desc_emotional_fa || "");
  const [descFunctionalEn, setDescFunctionalEn] = useState(product?.desc_functional_en || "");
  const [descFunctionalFa, setDescFunctionalFa] = useState(product?.desc_functional_fa || "");
  const [descStoryEn, setDescStoryEn] = useState(product?.desc_story_en || "");
  const [descStoryFa, setDescStoryFa] = useState(product?.desc_story_fa || "");

  const [brandGate, setBrandGate] = useState({
    ...EMPTY_BRAND_GATE,
    ...(product?.brand_gate || {}),
  });

  const [assignedAttributes, setAssignedAttributes] = useState<AssignedAttribute[]>(
    buildAssignedAttributes(attributes, variants)
  );
  const [variantRows, setVariantRows] = useState<VariantDraft[]>(buildInitialVariants(variants));

  useEffect(() => {
    if (!slug && nameEn) {
      setSlug(slugify(nameEn));
    }
  }, [nameEn, slug]);

  useEffect(() => {
    if (productType !== "variable") {
      return;
    }

    const totalStock = variantRows.reduce((sum, variant) => sum + Number(variant.stock_quantity || 0), 0);
    const variantPrices = variantRows.map((variant) => Number(variant.price || 0)).filter((value) => value > 0);

    if (totalStock > 0) {
      setStockQuantity(totalStock);
    }

    if (variantPrices.length > 0) {
      setPrice(String(Math.min(...variantPrices)));
    }
  }, [productType, variantRows]);

  const availableAttributes = useMemo(
    () => attributes.filter((attribute) => !assignedAttributes.some((assigned) => assigned.slug === attribute.slug)),
    [assignedAttributes, attributes]
  );

  const canGenerateVariants = assignedAttributes.some(
    (attribute) => attribute.useForVariations && attribute.selectedValues.length > 0
  );

  const marginPercent = useMemo(() => {
    const numericPrice = Number(price);
    const numericCost = Number(costPrice);

    if (!numericPrice || !numericCost) {
      return "0";
    }

    return (((numericPrice - numericCost) / numericPrice) * 100).toFixed(0);
  }, [costPrice, price]);

  const addAttribute = () => {
    if (!attributeToAdd) return;

    const selected = attributes.find((attribute) => attribute.id === attributeToAdd);
    if (!selected) return;

    setAssignedAttributes((current) => [
      ...current,
      {
        attributeId: selected.id,
        name_en: selected.name_en,
        name_fa: selected.name_fa,
        slug: selected.slug,
        type: selected.type,
        values: selected.values || [],
        selectedValues: [],
        visibleOnProductPage: true,
        useForVariations: true,
      },
    ]);
    setAttributeToAdd("");
  };

  const removeAttribute = (slugToRemove: string) => {
    setAssignedAttributes((current) => current.filter((attribute) => attribute.slug !== slugToRemove));
    setVariantRows((current) =>
      current.map((variant) => {
        const nextAttributes = { ...variant.attributes };
        delete nextAttributes[slugToRemove];
        return { ...variant, attributes: nextAttributes };
      })
    );
  };

  const toggleAssignedValue = (attributeSlug: string, valueLabel: string) => {
    setAssignedAttributes((current) =>
      current.map((attribute) => {
        if (attribute.slug !== attributeSlug) return attribute;

        const exists = attribute.selectedValues.includes(valueLabel);
        return {
          ...attribute,
          selectedValues: exists
            ? attribute.selectedValues.filter((value) => value !== valueLabel)
            : [...attribute.selectedValues, valueLabel],
        };
      })
    );
  };

  const updateAssignedAttribute = (
    attributeSlug: string,
    key: "visibleOnProductPage" | "useForVariations",
    value: boolean
  ) => {
    setAssignedAttributes((current) =>
      current.map((attribute) =>
        attribute.slug === attributeSlug ? { ...attribute, [key]: value } : attribute
      )
    );
  };

  const generateVariants = () => {
    const activeAttributes = assignedAttributes.filter(
      (attribute) => attribute.useForVariations && attribute.selectedValues.length > 0
    );

    if (activeAttributes.length === 0) {
      setErrorMessage("Select at least one attribute value before generating variants.");
      return;
    }

    const existingByKey = new Map(variantRows.map((variant) => [variantKey(variant.attributes), variant]));
    const combinations = cartesianProduct(
      activeAttributes.map((attribute) =>
        attribute.selectedValues.map((selectedValue) => ({
          slug: attribute.slug,
          value: selectedValue,
        }))
      )
    );

    const generated = combinations.map((combination, index) => {
      const attributesMap = Object.fromEntries(combination.map((entry) => [entry.slug, entry.value]));
      const key = variantKey(attributesMap);
      const existing = existingByKey.get(key);

      return (
        existing || {
          tempId: `generated-${index}-${key}`,
          attributes: attributesMap,
          sku: sku ? `${sku}-${combination.map((entry) => slugify(entry.value).toUpperCase()).join("-")}` : "",
          price,
          sale_price: salePrice,
          stock_quantity: "0",
          image_url: "",
          is_default: index === 0 && !variantRows.some((variant) => variant.is_default),
          is_active: true,
        }
      );
    });

    setVariantRows(generated);
    setErrorMessage("");
  };

  const updateVariantRow = (tempId: string, key: keyof VariantDraft, value: string | boolean) => {
    setVariantRows((current) =>
      current.map((variant) =>
        variant.tempId === tempId
          ? {
              ...variant,
              [key]: value,
              ...(key === "is_default" && value === true
                ? { is_default: true }
                : {}),
            }
          : key === "is_default" && value === true
            ? { ...variant, is_default: false }
            : variant
      )
    );
  };

  const removeVariantRow = (tempId: string) => {
    setVariantRows((current) => current.filter((variant) => variant.tempId !== tempId));
  };

  const normalizedGalleryUrls = useMemo(
    () =>
      galleryText
        .split("\n")
        .map((value) => value.trim())
        .filter(Boolean),
    [galleryText]
  );

  const saveProduct = async () => {
    setIsSaving(true);
    setErrorMessage("");

    try {
      const variantPayload =
        productType === "variable"
          ? variantRows.map((variant, index) => ({
              id: variant.id,
              sku: variant.sku || null,
              name_en:
                nameEn && Object.keys(variant.attributes).length > 0
                  ? `${nameEn} - ${Object.values(variant.attributes).join(" / ")}`
                  : nameEn || `Variant ${index + 1}`,
              name_fa:
                nameFa && Object.keys(variant.attributes).length > 0
                  ? `${nameFa} - ${Object.values(variant.attributes).join(" / ")}`
                  : nameFa || null,
              attributes: variant.attributes,
              price: variant.price ? Number(variant.price) : 0,
              sale_price: variant.sale_price ? Number(variant.sale_price) : null,
              cost_price: costPrice ? Number(costPrice) : null,
              stock_quantity: Number(variant.stock_quantity || 0),
              image_url: variant.image_url || null,
              is_default: variant.is_default,
              is_active: variant.is_active,
              sort_order: index,
            }))
          : [];

      const requestBody = {
        name_en: nameEn || "Untitled Product",
        name_fa: nameFa || "محصول جدید",
        slug: slug || `product-${Date.now()}`,
        status,
        visibility,
        product_type: productType,
        collection_id: collectionId || null,
        price: price ? Number(price) : 0,
        sale_price: salePrice ? Number(salePrice) : null,
        cost_price: costPrice ? Number(costPrice) : null,
        sku: sku || null,
        manage_stock: manageStock,
        stock_quantity: productType === "variable"
          ? variantPayload.reduce((sum, variant) => sum + Number(variant.stock_quantity || 0), 0)
          : Number(stockQuantity || 0),
        desc_emotional_en: descEmotionalEn,
        desc_emotional_fa: descEmotionalFa,
        desc_functional_en: descFunctionalEn,
        desc_functional_fa: descFunctionalFa,
        desc_story_en: descStoryEn,
        desc_story_fa: descStoryFa,
        featured_image_url: featuredImageUrl || null,
        gallery_urls: normalizedGalleryUrls,
        brand_gate: brandGate,
        variants: variantPayload,
      };

      const endpoint =
        mode === "create" ? "/api/admin/products" : `/api/admin/products/${product?.id}`;
      const method = mode === "create" ? "POST" : "PATCH";

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save product");
      }

      router.push("/admin/products");
      router.refresh();
    } catch (error: any) {
      setErrorMessage(error.message || "Failed to save product");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <Link href="/admin/products" className="p-2 rounded-xl bg-slate-900 border border-white/10 hover:border-white/20 text-slate-400 hover:text-white">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-display font-semibold text-white tracking-tight">
              {mode === "create" ? "Add New Product" : "Edit Product"}
            </h1>
            <p className="text-xs text-slate-400">
              Manage the product core data, global attributes, and WooCommerce-style variants in one editor.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={saveProduct}
          disabled={isSaving}
          className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-lapis-600 to-lapis-500 hover:from-lapis-500 hover:to-lapis-400 text-white font-medium text-xs shadow-md disabled:opacity-60"
        >
          <Save className="w-4 h-4" />
          {isSaving ? "Saving..." : "Save Product"}
        </button>
      </div>

      {errorMessage ? (
        <div className="rounded-2xl border border-pomegranate-500/20 bg-pomegranate-500/10 px-4 py-3 text-sm text-pomegranate-200">
          {errorMessage}
        </div>
      ) : null}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        <div className="xl:col-span-8 space-y-6">
          <div className="p-6 rounded-2xl bg-slate-900/50 backdrop-blur-sm border border-white/10 space-y-4">
            <h3 className="font-semibold text-white text-sm border-b border-white/10 pb-3">Product Name & URL</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Product Name (EN)</label>
                <input
                  type="text"
                  value={nameEn}
                  onChange={(event) => setNameEn(event.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-lapis-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">نام محصول (فارسی)</label>
                <input
                  type="text"
                  dir="rtl"
                  value={nameFa}
                  onChange={(event) => setNameFa(event.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-lapis-500 font-persian"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-300 mb-1">Slug</label>
                <input
                  type="text"
                  value={slug}
                  onChange={(event) => setSlug(event.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-lapis-500 font-mono"
                />
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/50 backdrop-blur-sm border border-white/10 space-y-4">
            <h3 className="font-semibold text-white text-sm border-b border-white/10 pb-3">Descriptions</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Emotional (EN)</label>
                <textarea
                  rows={3}
                  value={descEmotionalEn}
                  onChange={(event) => setDescEmotionalEn(event.target.value)}
                  className="w-full p-3 bg-slate-950 border border-white/10 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-gold-500"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">توصیف احساسی (فارسی)</label>
                <textarea
                  rows={3}
                  dir="rtl"
                  value={descEmotionalFa}
                  onChange={(event) => setDescEmotionalFa(event.target.value)}
                  className="w-full p-3 bg-slate-950 border border-white/10 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-gold-500 font-persian"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Functional Specs (EN)</label>
                <RichTextEditor value={descFunctionalEn} onChange={setDescFunctionalEn} />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">مشخصات فنی (فارسی)</label>
                <RichTextEditor value={descFunctionalFa} onChange={setDescFunctionalFa} dir="rtl" />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Story (EN)</label>
                <RichTextEditor value={descStoryEn} onChange={setDescStoryEn} />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">داستان ریشه (فارسی)</label>
                <RichTextEditor value={descStoryFa} onChange={setDescStoryFa} dir="rtl" />
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/50 backdrop-blur-sm border border-white/10 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-semibold text-white text-sm">Attributes & Variants</h3>
              {productType === "variable" ? (
                <button
                  type="button"
                  onClick={generateVariants}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-gold-500/10 border border-gold-500/30 text-gold-300 hover:text-gold-200 text-xs font-semibold"
                >
                  <RefreshCw className="w-4 h-4" />
                  Generate Variants
                </button>
              ) : null}
            </div>

            {productType !== "variable" ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/40 px-4 py-5 text-sm text-slate-400">
                <div>
                  Switch product type to <span className="text-white font-medium">Variable Product</span> to configure WooCommerce-style attributes and variant combinations.
                </div>
                <Link
                  href="/admin/products/attributes"
                  className="mt-3 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-200 hover:border-white/20 hover:text-white"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Manage Global Attributes
                </Link>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row gap-3">
                  <select
                    value={attributeToAdd}
                    onChange={(event) => setAttributeToAdd(event.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-sm text-slate-200 focus:outline-none"
                  >
                    <option value="">Add existing attribute...</option>
                    {availableAttributes.map((attribute) => (
                      <option key={attribute.id} value={attribute.id}>
                        {attribute.name_en}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={addAttribute}
                    disabled={!attributeToAdd}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-lapis-600 hover:bg-lapis-500 text-white text-sm disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                    Add
                  </button>
                  <Link
                    href="/admin/products/attributes"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-slate-900 px-4 py-2 text-sm text-slate-200 hover:border-white/20 hover:text-white"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Manage Attributes
                  </Link>
                </div>

                {assignedAttributes.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/40 px-4 py-5 text-sm text-slate-400">
                    No attributes added yet. Start with a global attribute like <span className="text-white">Color</span> or <span className="text-white">Size</span>.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {assignedAttributes.map((attribute) => (
                      <div key={attribute.slug} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 space-y-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h4 className="text-sm font-semibold text-white">{attribute.name_en}</h4>
                            <p className="text-xs text-slate-500 font-persian">{attribute.name_fa}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeAttribute(attribute.slug)}
                            className="inline-flex items-center gap-1 text-xs text-pomegranate-300 hover:text-pomegranate-200"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Remove
                          </button>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {attribute.values.map((value) => {
                            const selected = attribute.selectedValues.includes(value.label_en);

                            return (
                              <button
                                key={value.label_en}
                                type="button"
                                onClick={() => toggleAssignedValue(attribute.slug, value.label_en)}
                                className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-xs transition-colors ${
                                  selected
                                    ? "border-gold-500/50 bg-gold-500/10 text-gold-200"
                                    : "border-white/10 bg-slate-900 text-slate-300 hover:border-white/20"
                                }`}
                              >
                                {attribute.type === "color" && value.color_hex ? (
                                  <span className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: value.color_hex }} />
                                ) : null}
                                {value.label_en}
                              </button>
                            );
                          })}
                        </div>

                        <div className="flex flex-wrap gap-5 text-xs text-slate-300">
                          <label className="inline-flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={attribute.visibleOnProductPage}
                              onChange={(event) =>
                                updateAssignedAttribute(attribute.slug, "visibleOnProductPage", event.target.checked)
                              }
                            />
                            Visible on product page
                          </label>
                          <label className="inline-flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={attribute.useForVariations}
                              onChange={(event) =>
                                updateAssignedAttribute(attribute.slug, "useForVariations", event.target.checked)
                              }
                            />
                            Use for variations
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="rounded-2xl border border-white/10 overflow-hidden">
                  <div className="grid grid-cols-[minmax(220px,1.2fr)_110px_110px_120px_1fr_70px_70px] gap-0 bg-slate-950/80 text-[11px] uppercase tracking-wider text-slate-400">
                    <div className="px-4 py-3">Variant</div>
                    <div className="px-4 py-3">Price</div>
                    <div className="px-4 py-3">Sale</div>
                    <div className="px-4 py-3">Stock</div>
                    <div className="px-4 py-3">SKU</div>
                    <div className="px-4 py-3 text-center">Default</div>
                    <div className="px-4 py-3 text-center">Remove</div>
                  </div>

                  {variantRows.length === 0 ? (
                    <div className="px-4 py-6 text-sm text-slate-500 bg-slate-900/20">
                      {canGenerateVariants
                        ? "Generate variants from the selected attribute values."
                        : "Select attribute values, then generate variant combinations."}
                    </div>
                  ) : (
                    variantRows.map((variant) => (
                      <div
                        key={variant.tempId}
                        className="grid grid-cols-[minmax(220px,1.2fr)_110px_110px_120px_1fr_70px_70px] gap-0 border-t border-white/10 bg-slate-900/30"
                      >
                        <div className="px-4 py-3 text-sm text-white">
                          {Object.entries(variant.attributes).length > 0
                            ? Object.entries(variant.attributes)
                                .map(([attributeSlug, value]) => `${titleCase(attributeSlug)}: ${value}`)
                                .join(" / ")
                            : "Base product"}
                        </div>
                        <div className="px-4 py-2">
                          <input
                            type="number"
                            value={variant.price}
                            onChange={(event) => updateVariantRow(variant.tempId, "price", event.target.value)}
                            className="w-full px-2 py-1.5 bg-slate-950 border border-white/10 rounded-lg text-xs text-slate-200"
                          />
                        </div>
                        <div className="px-4 py-2">
                          <input
                            type="number"
                            value={variant.sale_price}
                            onChange={(event) => updateVariantRow(variant.tempId, "sale_price", event.target.value)}
                            className="w-full px-2 py-1.5 bg-slate-950 border border-white/10 rounded-lg text-xs text-slate-200"
                          />
                        </div>
                        <div className="px-4 py-2">
                          <input
                            type="number"
                            value={variant.stock_quantity}
                            onChange={(event) => updateVariantRow(variant.tempId, "stock_quantity", event.target.value)}
                            className="w-full px-2 py-1.5 bg-slate-950 border border-white/10 rounded-lg text-xs text-slate-200"
                          />
                        </div>
                        <div className="px-4 py-2">
                          <input
                            type="text"
                            value={variant.sku}
                            onChange={(event) => updateVariantRow(variant.tempId, "sku", event.target.value)}
                            className="w-full px-2 py-1.5 bg-slate-950 border border-white/10 rounded-lg text-xs text-slate-200"
                          />
                        </div>
                        <div className="px-4 py-2 flex items-center justify-center">
                          <input
                            type="radio"
                            name="default_variant"
                            checked={variant.is_default}
                            onChange={(event) => updateVariantRow(variant.tempId, "is_default", event.target.checked)}
                          />
                        </div>
                        <div className="px-4 py-2 flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => removeVariantRow(variant.tempId)}
                            className="text-pomegranate-300 hover:text-pomegranate-200"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="xl:col-span-4 space-y-6">
          <div className="p-5 rounded-2xl bg-slate-900/50 backdrop-blur-sm border border-white/10 space-y-4">
            <h3 className="font-semibold text-white text-sm border-b border-white/10 pb-2">Publishing</h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Status</label>
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-slate-200 focus:outline-none"
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Visibility</label>
                <select
                  value={visibility}
                  onChange={(event) => setVisibility(event.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-slate-200 focus:outline-none"
                >
                  <option value="public">Public</option>
                  <option value="hidden">Hidden</option>
                  <option value="password_protected">Password Protected</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Collection</label>
                <select
                  value={collectionId}
                  onChange={(event) => setCollectionId(event.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-slate-200 focus:outline-none"
                >
                  <option value="">Select Collection...</option>
                  {collections.map((collection) => (
                    <option key={collection.id} value={collection.id}>
                      {collection.name_en} {collection.name_fa ? `(${collection.name_fa})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Product Type</label>
                <select
                  value={productType}
                  onChange={(event) => setProductType(event.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-slate-200 focus:outline-none"
                >
                  <option value="physical">Physical Product</option>
                  <option value="pod">Print-on-Demand (POD)</option>
                  <option value="digital">Digital Download</option>
                  <option value="limited">Limited Edition</option>
                  <option value="variable">Variable Product</option>
                </select>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/50 backdrop-blur-sm border border-white/10 space-y-4">
            <h3 className="font-semibold text-white text-sm border-b border-white/10 pb-2">Pricing & Inventory</h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Price</label>
                <input
                  type="number"
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-slate-200"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Sale Price</label>
                <input
                  type="number"
                  value={salePrice}
                  onChange={(event) => setSalePrice(event.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-slate-200"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Cost Price</label>
                <input
                  type="number"
                  value={costPrice}
                  onChange={(event) => setCostPrice(event.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-slate-200"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Base SKU</label>
                <input
                  type="text"
                  value={sku}
                  onChange={(event) => setSku(event.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-slate-200"
                />
              </div>
            </div>

            <div className="space-y-3 border-t border-white/5 pt-3">
              <label className="inline-flex items-center gap-2 text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={manageStock}
                  onChange={(event) => setManageStock(event.target.checked)}
                />
                Manage stock
              </label>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  {productType === "variable" ? "Total Stock (derived from variants)" : "Stock Quantity"}
                </label>
                <input
                  type="number"
                  value={stockQuantity}
                  onChange={(event) => setStockQuantity(Number(event.target.value))}
                  disabled={productType === "variable"}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-slate-200 disabled:opacity-50"
                />
              </div>
              <div className="flex justify-between items-center text-xs text-slate-400 pt-2 border-t border-white/5">
                <span>Margin</span>
                <span className="font-semibold text-emerald-400">{marginPercent}%</span>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/50 backdrop-blur-sm border border-white/10 space-y-4">
            <h3 className="font-semibold text-white text-sm border-b border-white/10 pb-2">Media</h3>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Featured Image URL</label>
              <input
                type="text"
                value={featuredImageUrl}
                onChange={(event) => setFeaturedImageUrl(event.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-slate-200"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Gallery URLs (one per line)</label>
              <textarea
                rows={5}
                value={galleryText}
                onChange={(event) => setGalleryText(event.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-slate-200"
              />
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/50 backdrop-blur-sm border border-white/10 space-y-4">
            <h3 className="font-semibold text-white text-sm border-b border-white/10 pb-2">Brand Gate</h3>
            <div className="space-y-2 text-xs">
              {Object.entries(brandGate).map(([key, value]) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={() =>
                      setBrandGate((current) => ({ ...current, [key]: !current[key as keyof typeof current] }))
                    }
                  />
                  {titleCase(key)}
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
