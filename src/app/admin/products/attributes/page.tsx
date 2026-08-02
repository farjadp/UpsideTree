"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Trash2, Edit, Sliders, Check, Palette, Tag } from "lucide-react";

interface AttributeValue {
  label_en: string;
  label_fa: string;
  color_hex?: string;
}

interface ProductAttribute {
  id: string;
  name_en: string;
  name_fa: string;
  slug: string;
  type: 'select' | 'color' | 'text' | 'number';
  values: AttributeValue[];
  is_visible: boolean;
  is_variation: boolean;
}

export default function AttributesPage() {
  const [attributes, setAttributes] = useState<ProductAttribute[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [nameEn, setNameEn] = useState("");
  const [nameFa, setNameFa] = useState("");
  const [slug, setSlug] = useState("");
  const [type, setType] = useState<'select' | 'color' | 'text' | 'number'>("select");
  const [values, setValues] = useState<AttributeValue[]>([
    { label_en: "Black", label_fa: "مشکی", color_hex: "#000000" },
    { label_en: "White", label_fa: "سفید", color_hex: "#FFFFFF" },
  ]);

  useEffect(() => {
    fetchAttributes();
  }, []);

  const fetchAttributes = async () => {
    try {
      const res = await fetch("/api/admin/attributes");
      const data = await res.json();
      if (data.attributes) {
        setAttributes(data.attributes);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const addValueRow = () => {
    setValues([...values, { label_en: "", label_fa: "", color_hex: "#1D4E89" }]);
  };

  const removeValueRow = (idx: number) => {
    setValues(values.filter((_, i) => i !== idx));
  };

  const handleSaveAttribute = async () => {
    if (!nameEn || !nameFa) return;
    try {
      await fetch("/api/admin/attributes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name_en: nameEn,
          name_fa: nameFa,
          slug: slug || nameEn.toLowerCase().replace(/\s+/g, '-'),
          type,
          values,
          is_visible: true,
          is_variation: true
        })
      });
      setIsAdding(false);
      setNameEn("");
      setNameFa("");
      setSlug("");
      fetchAttributes();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-semibold text-white tracking-tight">Product Attributes</h1>
          <p className="text-sm text-slate-400 mt-1">Define global attributes like Size, Color, and Material for product variations.</p>
        </div>

        <button
          onClick={() => setIsAdding(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-lapis-600 to-lapis-500 hover:from-lapis-500 hover:to-lapis-400 text-white font-medium text-sm shadow-[0_4px_20px_rgba(29,78,137,0.4)] transition-all"
        >
          <Plus className="w-4 h-4" />
          Add Attribute
        </button>
      </div>

      {/* Add Attribute Modal / Drawer */}
      {isAdding && (
        <div className="p-6 rounded-2xl bg-slate-900/90 border border-gold-500/30 shadow-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <h3 className="text-lg font-semibold text-white">Create New Attribute</h3>
            <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-white">✕</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Name (English) *</label>
              <input
                type="text"
                placeholder="e.g. Color"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-lapis-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">نام (فارسی) *</label>
              <input
                type="text"
                dir="rtl"
                placeholder="مثلا: رنگ"
                value={nameFa}
                onChange={(e) => setNameFa(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-lapis-500 font-persian"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-sm text-slate-200 focus:outline-none"
              >
                <option value="select">Select / Dropdown</option>
                <option value="color">Color Swatch</option>
                <option value="text">Text Button</option>
                <option value="number">Number</option>
              </select>
            </div>
          </div>

          {/* Attribute Values List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-200">Values / Swatches</h4>
              <button onClick={addValueRow} className="text-xs text-gold-400 hover:underline">+ Add Value</button>
            </div>

            {values.map((v, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <input
                  type="text"
                  placeholder="Label EN"
                  value={v.label_en}
                  onChange={(e) => {
                    const newVals = [...values];
                    newVals[idx].label_en = e.target.value;
                    setValues(newVals);
                  }}
                  className="flex-1 px-3 py-1.5 bg-slate-950 border border-white/10 rounded-lg text-xs text-slate-200"
                />
                <input
                  type="text"
                  dir="rtl"
                  placeholder="عنوان فارسی"
                  value={v.label_fa}
                  onChange={(e) => {
                    const newVals = [...values];
                    newVals[idx].label_fa = e.target.value;
                    setValues(newVals);
                  }}
                  className="flex-1 px-3 py-1.5 bg-slate-950 border border-white/10 rounded-lg text-xs text-slate-200 font-persian"
                />
                {type === "color" && (
                  <input
                    type="color"
                    value={v.color_hex || "#000000"}
                    onChange={(e) => {
                      const newVals = [...values];
                      newVals[idx].color_hex = e.target.value;
                      setValues(newVals);
                    }}
                    className="w-8 h-8 rounded-lg border border-white/10 bg-transparent cursor-pointer"
                  />
                )}
                <button onClick={() => removeValueRow(idx)} className="text-slate-500 hover:text-pomegranate-400 p-1">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <button onClick={() => setIsAdding(false)} className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white">Cancel</button>
            <button onClick={handleSaveAttribute} className="px-5 py-2 rounded-xl bg-gold-500 hover:bg-gold-400 text-slate-950 font-semibold text-xs shadow-md">
              Save Attribute
            </button>
          </div>
        </div>
      )}

      {/* Attributes Table */}
      <div className="rounded-2xl bg-slate-900/50 backdrop-blur-sm border border-white/10 overflow-hidden shadow-xl">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-950/60 text-slate-400 uppercase text-xs tracking-wider border-b border-white/10">
            <tr>
              <th className="px-6 py-4">Attribute</th>
              <th className="px-6 py-4">Type</th>
              <th className="px-6 py-4">Values / Swatches</th>
              <th className="px-6 py-4">Used For</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {attributes.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-slate-500">
                  <Sliders className="w-10 h-10 mx-auto mb-3 opacity-30 text-slate-400" />
                  <p className="text-sm font-medium text-slate-300">No global attributes defined yet.</p>
                </td>
              </tr>
            ) : (
              attributes.map((attr) => (
                <tr key={attr.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 font-medium text-white">
                    {attr.name_en} <span className="text-xs text-gold-400/80 font-persian">({attr.name_fa})</span>
                  </td>
                  <td className="px-6 py-4 capitalize text-xs text-slate-400">{attr.type}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1.5">
                      {attr.values?.map((val, idx) => (
                        <span key={idx} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-slate-950 border border-white/10 text-slate-300">
                          {attr.type === "color" && val.color_hex && (
                            <span className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: val.color_hex }} />
                          )}
                          {val.label_en}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-400">Variants & Filters</td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 rounded-lg bg-slate-950/60 hover:bg-white/10 text-slate-300"><Edit className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
