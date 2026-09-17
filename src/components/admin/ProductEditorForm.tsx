"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ExternalLink, Loader2, Plus, RefreshCw, Save, Sparkles, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { MARGIN_MIN, isMarginInBand, netMargin, netProfit, priceForCost } from "@/lib/pricing";

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
  cost_price?: number | string | null;
  printify_variant_id?: number | string | null;
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
  additional_collection_ids?: string[] | null;
  auto_pricing?: boolean | null;
  printify_product_id?: string | null;
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
  seo_title_en?: string | null;
  seo_title_fa?: string | null;
  seo_description_en?: string | null;
  seo_description_fa?: string | null;
  featured_image_url?: string | null;
  gallery_urls?: string[] | null;
};

type CollectionRecord = {
  id: string;
  name_en: string;
  name_fa?: string | null;
  parent_id?: string | null;
};

type AiDraft = {
  name_en: string;
  name_fa: string;
  emotional_en: string;
  emotional_fa: string;
  functional_en: string[];
  functional_fa: string[];
  story_en: string;
  story_fa: string;
  seo_title_en: string;
  seo_title_fa: string;
  seo_description_en: string;
  seo_description_fa: string;
};

type AiDraftField = keyof AiDraft;

type AiProviderId = "anthropic" | "openai";
type AiProviderInfo = { id: AiProviderId; model: string };
type AiComparison = {
  drafts: Partial<Record<AiProviderId, AiDraft>>;
  errors: Partial<Record<AiProviderId, string>>;
};

const AI_FIELD_LABELS: Array<[AiDraftField, string]> = [
  ["name_en", "Name (EN)"],
  ["name_fa", "Name (FA)"],
  ["emotional_en", "Emotional (EN)"],
  ["emotional_fa", "Emotional (FA)"],
  ["functional_en", "Specs (EN)"],
  ["functional_fa", "Specs (FA)"],
  ["story_en", "Story (EN)"],
  ["story_fa", "Story (FA)"],
  ["seo_title_en", "SEO title (EN)"],
  ["seo_title_fa", "SEO title (FA)"],
  ["seo_description_en", "SEO description (EN)"],
  ["seo_description_fa", "SEO description (FA)"],
];

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

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

// "Sweatshirts" exists under Men, Women and Kids; prefix subcategories
// with their parent so the pickers aren't a list of identical names.
function labelCollections(collections: CollectionRecord[]) {
  const byId = new Map(collections.map((collection) => [collection.id, collection]));
  return collections
    .map((collection) => {
      const parent = collection.parent_id ? byId.get(collection.parent_id) : null;
      return { ...collection, label: parent ? `${parent.name_en} › ${collection.name_en}` : collection.name_en };
    })
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function ProductEditorForm({
  mode,
  product,
  variants = [],
  attributes,
  collections: rawCollections,
}: ProductEditorFormProps) {
  const collections = useMemo(() => labelCollections(rawCollections), [rawCollections]);
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [generatingTarget, setGeneratingTarget] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [attributeToAdd, setAttributeToAdd] = useState("");

  const [nameEn, setNameEn] = useState(product?.name_en || "");
  const [nameFa, setNameFa] = useState(product?.name_fa || "");
  const [slug, setSlug] = useState(product?.slug || "");
  const [status, setStatus] = useState(product?.status || "draft");
  const [visibility, setVisibility] = useState(product?.visibility || "public");
  const [productType, setProductType] = useState(product?.product_type || "physical");
  const [collectionId, setCollectionId] = useState(product?.collection_id || "");
  // Only present once migration 20260913000000 is applied; until then the
  // field is hidden and never sent, so saving can't hit a missing column.
  const supportsAdditionalCollections = Boolean(product && Array.isArray(product.additional_collection_ids));
  const [additionalCollectionIds, setAdditionalCollectionIds] = useState<string[]>(
    product?.additional_collection_ids ?? []
  );
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
  const [seoTitleEn, setSeoTitleEn] = useState(product?.seo_title_en || "");
  const [seoTitleFa, setSeoTitleFa] = useState(product?.seo_title_fa || "");
  const [seoDescriptionEn, setSeoDescriptionEn] = useState(product?.seo_description_en || "");
  const [seoDescriptionFa, setSeoDescriptionFa] = useState(product?.seo_description_fa || "");
  // One AI draft covers every copy field; per-field buttons apply from it
  // so trying one field doesn't cost a call per field.
  const [aiDraft, setAiDraft] = useState<AiDraft | null>(null);
  // Margin-based pricing for print-on-demand variants. The switch appears
  // once migration 20260914000000 is applied; before that every product is
  // auto-priced by the sync.
  const supportsAutoPricing = Boolean(product && typeof product.auto_pricing === "boolean");
  const [autoPricing, setAutoPricing] = useState(product?.auto_pricing !== false);
  const [variantPriceEdits, setVariantPriceEdits] = useState<Record<string, string>>({});
  const pricedVariants = variants.filter((variant) => variant.id && variant.cost_price != null);
  const [aiProviders, setAiProviders] = useState<AiProviderInfo[]>([]);
  const [aiProvider, setAiProvider] = useState<AiProviderId | null>(null);
  const [comparison, setComparison] = useState<AiComparison | null>(null);

  // Which AI providers have keys; a comparison is offered only when both do.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/ai/generate")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setAiProviders(data.providers ?? []);
        setAiProvider(data.default ?? null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

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

  const selectedCollectionName = useMemo(() => {
    const selected = collections.find((collection) => collection.id === collectionId);
    return selected?.name_en || selected?.name_fa || "";
  }, [collectionId, collections]);

  const requestAiDraft = async (provider: AiProviderId | null = aiProvider): Promise<AiDraft | null> => {
    setErrorMessage("");
    const options = Array.from(
      new Set(
        variants.flatMap((variant) => Object.values(normalizeVariantAttributes(variant)).filter(Boolean))
      )
    ).slice(0, 80);

    const response = await fetch("/api/ai/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name_en: nameEn,
        name_fa: nameFa,
        product_type: productType,
        collection: selectedCollectionName,
        specs: descFunctionalEn,
        options,
        image_url: /^https?:\/\//.test(featuredImageUrl) ? featuredImageUrl : "",
        ...(provider ? { provider } : {}),
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.draft) {
      throw new Error(data.error || "AI drafting failed");
    }
    if (!provider || provider === aiProvider) setAiDraft(data.draft);
    return data.draft as AiDraft;
  };

  const providerLabel = (id: AiProviderId) => (id === "anthropic" ? "Claude" : "OpenAI");

  // Both providers at once, shown side by side. Choosing a side (or single
  // fields) applies them; the chosen provider's draft then backs the
  // per-field AI buttons.
  const compareProviders = async () => {
    setGeneratingTarget("compare");
    setErrorMessage("");
    try {
      const ids = aiProviders.map((provider) => provider.id);
      const results = await Promise.allSettled(ids.map((id) => requestAiDraft(id)));
      const next: AiComparison = { drafts: {}, errors: {} };
      results.forEach((result, index) => {
        const id = ids[index];
        if (result.status === "fulfilled" && result.value) next.drafts[id] = result.value;
        else next.errors[id] = result.status === "rejected" && result.reason instanceof Error ? result.reason.message : "Failed";
      });
      setComparison(next);
    } finally {
      setGeneratingTarget("");
    }
  };

  const applyComparedField = (provider: AiProviderId, field: AiDraftField) => {
    const draft = comparison?.drafts[provider];
    if (!draft) return;
    applyDraftField(field, draft);
    setAiProvider(provider);
    setAiDraft(draft);
  };

  const applyComparedDraft = (provider: AiProviderId) => {
    const draft = comparison?.drafts[provider];
    if (!draft) return;
    (Object.keys(draft) as AiDraftField[]).forEach((field) => applyDraftField(field, draft));
    setAiProvider(provider);
    setAiDraft(draft);
    setComparison(null);
  };

  // Field setters keyed by draft field. HTML fields get the markup the rich
  // text editor stores.
  const applyDraftField = (field: AiDraftField, draft: AiDraft) => {
    const listHtml = (lines: string[]) => `<ul>${lines.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>`;
    const paragraphHtml = (text: string) =>
      text.split(/\n{2,}/).map((part) => `<p>${escapeHtml(part.trim())}</p>`).join("");

    const appliers: Record<AiDraftField, () => void> = {
      name_en: () => setNameEn(draft.name_en),
      name_fa: () => setNameFa(draft.name_fa),
      emotional_en: () => setDescEmotionalEn(draft.emotional_en),
      emotional_fa: () => setDescEmotionalFa(draft.emotional_fa),
      functional_en: () => setDescFunctionalEn(listHtml(draft.functional_en)),
      functional_fa: () => setDescFunctionalFa(listHtml(draft.functional_fa)),
      story_en: () => setDescStoryEn(paragraphHtml(draft.story_en)),
      story_fa: () => setDescStoryFa(paragraphHtml(draft.story_fa)),
      seo_title_en: () => setSeoTitleEn(draft.seo_title_en),
      seo_title_fa: () => setSeoTitleFa(draft.seo_title_fa),
      seo_description_en: () => setSeoDescriptionEn(draft.seo_description_en),
      seo_description_fa: () => setSeoDescriptionFa(draft.seo_description_fa),
    };
    appliers[field]();
  };

  const isBlank = (html: string) => !html.replace(/<[^>]+>/g, "").trim();

  const currentFieldValues: Record<AiDraftField, string> = {
    name_en: nameEn,
    name_fa: nameFa === nameEn ? "" : nameFa,
    emotional_en: descEmotionalEn,
    emotional_fa: descEmotionalFa,
    // Printify's imported description is the source for the specs, so it
    // counts as "empty" for drafting purposes only when truly blank.
    functional_en: descFunctionalEn,
    functional_fa: descFunctionalFa,
    story_en: descStoryEn,
    story_fa: descStoryFa,
    seo_title_en: seoTitleEn,
    seo_title_fa: seoTitleFa,
    seo_description_en: seoDescriptionEn,
    seo_description_fa: seoDescriptionFa,
  };

  // "Draft all": fills every empty field (a Persian name identical to the
  // English one counts as empty) and leaves anything already written alone.
  const draftAllEmpty = async () => {
    setGeneratingTarget("all");
    try {
      const draft = await requestAiDraft();
      if (!draft) return;
      (Object.keys(currentFieldValues) as AiDraftField[])
        .filter((field) => isBlank(currentFieldValues[field]))
        .forEach((field) => applyDraftField(field, draft));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "AI drafting failed");
    } finally {
      setGeneratingTarget("");
    }
  };

  // Per-field: replace this one field, reusing the current draft if there is one.
  const draftField = async (field: AiDraftField) => {
    setGeneratingTarget(field);
    try {
      const draft = aiDraft ?? (await requestAiDraft());
      if (draft) applyDraftField(field, draft);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "AI drafting failed");
    } finally {
      setGeneratingTarget("");
    }
  };

  const aiButton = (target: AiDraftField) => (
    <button
      type="button"
      onClick={() => draftField(target)}
      disabled={Boolean(generatingTarget)}
      title={aiDraft ? "Replace with the AI draft" : "Draft with AI"}
      className="inline-flex items-center gap-1.5 rounded-lg border border-gold-500/30 bg-gold-500/10 px-2.5 py-1 text-[11px] font-semibold text-gold-300 hover:border-gold-400/50 hover:text-gold-200 disabled:opacity-50"
    >
      {generatingTarget === target || (generatingTarget === "all" && isBlank(currentFieldValues[target])) ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <Sparkles className="w-3.5 h-3.5" />
      )}
      AI
    </button>
  );

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

  const addGalleryImage = (url: string) => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return;

    const nextUrls = [...normalizedGalleryUrls, trimmedUrl];
    setGalleryText(Array.from(new Set(nextUrls)).join("\n"));
  };

  const removeGalleryImage = (urlToRemove: string) => {
    setGalleryText(normalizedGalleryUrls.filter((url) => url !== urlToRemove).join("\n"));
  };

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
        ...(supportsAutoPricing ? { auto_pricing: autoPricing } : {}),
        // Manual per-size prices for print-on-demand products (auto pricing off).
        ...(!autoPricing && Object.keys(variantPriceEdits).length > 0
          ? {
              variant_prices: Object.entries(variantPriceEdits)
                .map(([id, value]) => ({ id, price: Number(value) }))
                .filter((entry) => entry.price > 0),
            }
          : {}),
        ...(supportsAdditionalCollections
          ? { additional_collection_ids: additionalCollectionIds.filter((id) => id && id !== collectionId) }
          : {}),
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
        seo_title_en: seoTitleEn.trim() || null,
        seo_title_fa: seoTitleFa.trim() || null,
        seo_description_en: seoDescriptionEn.trim() || null,
        seo_description_fa: seoDescriptionFa.trim() || null,
        featured_image_url: featuredImageUrl || null,
        gallery_urls: normalizedGalleryUrls,
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
      {comparison && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 md:p-10" role="dialog" aria-modal="true" aria-label="Compare AI drafts">
          <div className="w-full max-w-6xl rounded-2xl border border-white/10 bg-slate-900 p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-white">Compare AI drafts</h3>
                <p className="text-xs text-slate-400">Pick a whole draft, or use individual fields from either side. Nothing is saved until you press Save.</p>
              </div>
              <button type="button" onClick={() => setComparison(null)} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-300 hover:text-white">
                Close
              </button>
            </div>

            <div className="grid grid-cols-[140px_1fr_1fr] gap-3 text-xs">
              <div />
              {aiProviders.map((provider) => (
                <div key={provider.id} className="flex items-center justify-between gap-2 rounded-xl bg-slate-950 px-3 py-2">
                  <span className="font-semibold text-slate-200">
                    {providerLabel(provider.id)} <span className="font-normal text-slate-500">{provider.model}</span>
                  </span>
                  {comparison.drafts[provider.id] ? (
                    <button type="button" onClick={() => applyComparedDraft(provider.id)} className="rounded-lg bg-gold-500/15 px-2.5 py-1 font-semibold text-gold-300 hover:text-gold-200">
                      Use all
                    </button>
                  ) : (
                    <span className="text-red-400">{comparison.errors[provider.id]}</span>
                  )}
                </div>
              ))}

              {AI_FIELD_LABELS.map(([field, label]) => (
                <div key={field} className="contents">
                  <div className="pt-2 text-slate-400">{label}</div>
                  {aiProviders.map((provider) => {
                    const draft = comparison.drafts[provider.id];
                    const value = draft?.[field];
                    const rtl = field.endsWith("_fa");
                    return (
                      <div key={provider.id} className="rounded-xl border border-white/5 bg-slate-950/60 p-3">
                        {draft ? (
                          <>
                            <div dir={rtl ? "rtl" : "ltr"} className={`whitespace-pre-line text-slate-200 ${rtl ? "font-persian text-right" : ""}`}>
                              {Array.isArray(value) ? value.map((line) => `• ${line}`).join("\n") : value}
                            </div>
                            <button type="button" onClick={() => applyComparedField(provider.id, field)} className="mt-2 text-[11px] font-semibold text-gold-300 hover:text-gold-200">
                              Use this
                            </button>
                          </>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
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
                <div className="mb-1 flex items-center justify-between gap-2">
                  <label className="block text-xs font-medium text-slate-300">Product Name (EN)</label>
                  {aiButton("name_en")}
                </div>
                <input
                  type="text"
                  value={nameEn}
                  onChange={(event) => setNameEn(event.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-lapis-500"
                />
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <label className="block text-xs font-medium text-slate-300">نام محصول (فارسی)</label>
                  {aiButton("name_fa")}
                </div>
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
            <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
              <div>
                <h3 className="font-semibold text-white text-sm">Descriptions</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  AI drafts from the title, specs, options and main image. Review everything before saving.
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
              {aiProviders.length > 1 && (
                <>
                  <select
                    value={aiProvider ?? ""}
                    onChange={(event) => {
                      setAiProvider(event.target.value as AiProviderId);
                      setAiDraft(null);
                    }}
                    aria-label="AI provider"
                    className="rounded-xl border border-white/10 bg-slate-950 px-2 py-2 text-xs text-slate-200 focus:outline-none"
                  >
                    {aiProviders.map((provider) => (
                      <option key={provider.id} value={provider.id}>
                        {providerLabel(provider.id)} ({provider.model})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={compareProviders}
                    disabled={Boolean(generatingTarget)}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-gold-500/40 hover:text-gold-200 disabled:opacity-50"
                  >
                    {generatingTarget === "compare" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    Compare Claude vs OpenAI
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={draftAllEmpty}
                disabled={Boolean(generatingTarget)}
                className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-gold-500/30 bg-gold-500/10 px-3 py-2 text-xs font-semibold text-gold-300 hover:border-gold-400/50 hover:text-gold-200 disabled:opacity-50"
              >
                {generatingTarget === "all" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Draft empty fields with AI
              </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <label className="block text-[11px] text-slate-400">Emotional (EN)</label>
                  {aiButton("emotional_en")}
                </div>
                <textarea
                  rows={3}
                  value={descEmotionalEn}
                  onChange={(event) => setDescEmotionalEn(event.target.value)}
                  className="w-full p-3 bg-slate-950 border border-white/10 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-gold-500"
                />
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <label className="block text-[11px] text-slate-400">توصیف احساسی (فارسی)</label>
                  {aiButton("emotional_fa")}
                </div>
                <textarea
                  rows={3}
                  dir="rtl"
                  value={descEmotionalFa}
                  onChange={(event) => setDescEmotionalFa(event.target.value)}
                  className="w-full p-3 bg-slate-950 border border-white/10 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-gold-500 font-persian"
                />
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <label className="block text-[11px] text-slate-400">Functional Specs (EN)</label>
                  {aiButton("functional_en")}
                </div>
                <RichTextEditor value={descFunctionalEn} onChange={setDescFunctionalEn} />
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <label className="block text-[11px] text-slate-400">مشخصات فنی (فارسی)</label>
                  {aiButton("functional_fa")}
                </div>
                <RichTextEditor value={descFunctionalFa} onChange={setDescFunctionalFa} dir="rtl" />
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <label className="block text-[11px] text-slate-400">Story (EN)</label>
                  {aiButton("story_en")}
                </div>
                <RichTextEditor value={descStoryEn} onChange={setDescStoryEn} />
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <label className="block text-[11px] text-slate-400">داستان ریشه (فارسی)</label>
                  {aiButton("story_fa")}
                </div>
                <RichTextEditor value={descStoryFa} onChange={setDescStoryFa} dir="rtl" />
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/50 backdrop-blur-sm border border-white/10 space-y-4">
            <div className="border-b border-white/10 pb-3">
              <h3 className="font-semibold text-white text-sm">Search Engine (SEO)</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Shown in Google results and browser tabs. Empty fields fall back to the product name and emotional line.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {([
                ["seo_title_en", "SEO title (EN)", seoTitleEn, setSeoTitleEn, 60, "ltr"],
                ["seo_title_fa", "عنوان سئو (فارسی)", seoTitleFa, setSeoTitleFa, 60, "rtl"],
                ["seo_description_en", "Meta description (EN)", seoDescriptionEn, setSeoDescriptionEn, 155, "ltr"],
                ["seo_description_fa", "توضیح متا (فارسی)", seoDescriptionFa, setSeoDescriptionFa, 155, "rtl"],
              ] as const).map(([field, label, value, setValue, limit, dir]) => (
                <div key={field}>
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <label className="block text-[11px] text-slate-400">
                      {label}{" "}
                      <span className={value.length > limit ? "text-red-400" : "text-slate-600"}>
                        {value.length}/{limit}
                      </span>
                    </label>
                    {aiButton(field)}
                  </div>
                  <textarea
                    rows={field.startsWith("seo_title") ? 2 : 3}
                    dir={dir}
                    value={value}
                    onChange={(event) => setValue(event.target.value)}
                    className={`w-full p-3 bg-slate-950 border border-white/10 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-gold-500 ${dir === "rtl" ? "font-persian" : ""}`}
                  />
                </div>
              ))}
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
              ) : (
                <button
                  type="button"
                  onClick={() => setProductType("variable")}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 bg-slate-950 text-slate-200 hover:border-gold-500/40 hover:text-gold-200 text-xs font-semibold"
                >
                  Switch to Variable Product
                </button>
              )}
            </div>

            <div className="space-y-6">
                {productType !== "variable" ? (
                  <div className="rounded-2xl border border-gold-500/20 bg-gold-500/10 px-4 py-3 text-sm text-gold-100">
                    Global attributes are visible here for setup. Switch to <span className="font-semibold">Variable Product</span> when you want to generate sellable variants from selected values.
                  </div>
                ) : null}

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
                      {collection.label} {collection.name_fa ? `(${collection.name_fa})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {supportsAdditionalCollections && (
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Also show in</label>
                  <select
                    multiple
                    size={6}
                    value={additionalCollectionIds}
                    onChange={(event) =>
                      setAdditionalCollectionIds(Array.from(event.target.selectedOptions, (option) => option.value))
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-slate-200 focus:outline-none"
                  >
                    {collections
                      .filter((collection) => collection.id !== collectionId)
                      .map((collection) => (
                        <option key={collection.id} value={collection.id}>
                          {collection.label} {collection.name_fa ? `(${collection.name_fa})` : ""}
                        </option>
                      ))}
                  </select>
                  <p className="mt-1 text-[11px] text-slate-500">
                    E.g. unisex apparel under both Men and Women. Cmd/Ctrl-click to select several.
                  </p>
                </div>
              )}

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

          {pricedVariants.length > 0 && (
            <div className="p-5 rounded-2xl bg-slate-900/50 backdrop-blur-sm border border-white/10 space-y-3">
              <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2">
                <h3 className="font-semibold text-white text-sm">Margin pricing</h3>
                {supportsAutoPricing && (
                  <label className="inline-flex items-center gap-2 text-[11px] text-slate-300">
                    <input type="checkbox" checked={autoPricing} onChange={(event) => setAutoPricing(event.target.checked)} />
                    Automatic
                  </label>
                )}
              </div>
              <p className="text-[11px] text-slate-500">
                Net margin after Printify cost and Stripe fee (3% giving comes out of it). Target {Math.round(MARGIN_MIN * 100)}%, exact to the cent.
                {autoPricing
                  ? " Automatic: the sync reprices any size whose cost or exchange rate moved."
                  : " Manual: prices below are yours; the sync won't change them."}
              </p>
              <div className="space-y-1.5">
                {pricedVariants.map((variant) => {
                  const id = variant.id as string;
                  const cost = Number(variant.cost_price);
                  const current = Number(variantPriceEdits[id] ?? variant.price ?? 0);
                  const margin = netMargin(current, cost);
                  const inBand = isMarginInBand(current, cost);
                  const label = Object.values(normalizeVariantAttributes(variant)).filter(Boolean).join(" / ") || variant.name_en || "Variant";
                  return (
                    <div key={id} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 text-[11px]">
                      <span className="truncate text-slate-300" title={label}>{label}</span>
                      <span className="text-slate-500">cost {cost.toFixed(2)}</span>
                      {autoPricing ? (
                        <span className="w-16 text-right text-slate-200">{current.toFixed(2)}</span>
                      ) : (
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={variantPriceEdits[id] ?? String(variant.price ?? "")}
                          onChange={(event) => setVariantPriceEdits((edits) => ({ ...edits, [id]: event.target.value }))}
                          className="w-16 rounded-lg border border-white/10 bg-slate-950 px-1.5 py-1 text-right text-slate-200"
                        />
                      )}
                      <span
                        className={`w-24 text-right font-semibold ${inBand ? "text-emerald-400" : margin < MARGIN_MIN ? "text-red-400" : "text-amber-300"}`}
                        title={`Suggested ${priceForCost(cost).toFixed(2)} · profit ${netProfit(current, cost).toFixed(2)}`}
                      >
                        {(margin * 100).toFixed(1)}%{!inBand && ` → ${priceForCost(cost).toFixed(2)}`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

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
              {!manageStock && (
                <p className="text-[11px] text-emerald-400/80">
                  Stock not tracked (print-on-demand): always available to buy, quantity is ignored.
                </p>
              )}
              <div className={manageStock ? "" : "hidden"}>
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

            <ImageUpload
              name="featured_image_url"
              label="Featured Image"
              folder="products"
              value={featuredImageUrl}
              initialImage={featuredImageUrl}
              onChange={setFeaturedImageUrl}
            />

            <div className="space-y-3 border-t border-white/5 pt-4">
              <ImageUpload
                key={normalizedGalleryUrls.join("|")}
                name="gallery_image_upload"
                label="Add Gallery Image"
                folder="products/gallery"
                value=""
                initialImage=""
                onChange={addGalleryImage}
              />

              {normalizedGalleryUrls.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {normalizedGalleryUrls.map((url) => (
                    <div
                      key={url}
                      className="group relative aspect-square overflow-hidden rounded-xl border border-white/10 bg-slate-950"
                    >
                      <img src={url} alt="Product gallery image" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeGalleryImage(url)}
                        className="absolute right-1.5 top-1.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-950/90 text-pomegranate-200 opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
                        aria-label="Remove gallery image"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-white/10 bg-slate-950/40 px-3 py-4 text-xs text-slate-500">
                  No gallery images yet.
                </div>
              )}

              <div>
                <label className="block text-xs text-slate-400 mb-1">Gallery URLs (advanced, one per line)</label>
                <textarea
                  rows={4}
                  value={galleryText}
                  onChange={(event) => setGalleryText(event.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-slate-200"
                />
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
