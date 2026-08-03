"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Loader2, CheckCircle2, Upload, X } from "lucide-react";

interface Setting {
  id?: string;
  key: string;
  value: string;
  value_type: string;
  label_en: string;
}

interface BrandingSettingsFormProps {
  initialSettings: Record<string, Setting>;
}

export default function BrandingSettingsForm({ initialSettings }: BrandingSettingsFormProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [formData, setFormData] = useState({
    color_primary: initialSettings.color_primary?.value || "#1D4E89",
    color_secondary: initialSettings.color_secondary?.value || "#B48635",
    color_background: initialSettings.color_background?.value || "#F4EFE3",
    color_text: initialSettings.color_text?.value || "#1E293B",
    font_heading: initialSettings.font_heading?.value || "Inter",
    font_body: initialSettings.font_body?.value || "Roboto",
    logo_light: initialSettings.logo_light?.value || "",
    logo_dark: initialSettings.logo_dark?.value || "",
    logo_favicon: initialSettings.logo_favicon?.value || "",
    logo_app_icon: initialSettings.logo_app_icon?.value || "",
    logo_og_image: initialSettings.logo_og_image?.value || "",
    logo_email: initialSettings.logo_email?.value || "",
    logo_invoice: initialSettings.logo_invoice?.value || "",
  });

  const handleChange = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const settingsMetadata: Record<string, { label: string; type: string }> = {
        color_primary: { label: "Primary Color", type: "string" },
        color_secondary: { label: "Secondary Color", type: "string" },
        color_background: { label: "Background Color", type: "string" },
        color_text: { label: "Text Color", type: "string" },
        font_heading: { label: "Heading Font", type: "string" },
        font_body: { label: "Body Font", type: "string" },
        logo_light: { label: "Light Mode Logo", type: "file_url" },
        logo_dark: { label: "Dark Mode Logo", type: "file_url" },
        logo_favicon: { label: "Favicon", type: "file_url" },
        logo_app_icon: { label: "App Icon", type: "file_url" },
        logo_og_image: { label: "Default OG Image", type: "file_url" },
        logo_email: { label: "Email Template Logo", type: "file_url" },
        logo_invoice: { label: "Invoice Logo", type: "file_url" },
      };

      const promises = Object.entries(formData).map(async ([key, value]) => {
        const meta = settingsMetadata[key];
        const res = await fetch("/api/admin/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            namespace: "branding",
            key,
            value,
            value_type: meta.type,
            label_en: meta.label,
            is_public: true,
          }),
        });
        if (!res.ok) throw new Error(`Failed to save ${key}`);
      });

      await Promise.all(promises);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error("Error saving branding settings:", error);
      alert("Failed to save branding settings.");
    } finally {
      setIsSaving(false);
    }
  };

  const LogoUploader = ({ label, keyName, value, description }: { label: string, keyName: string, value: string, description: string }) => (
    <div className="space-y-2 bg-slate-950/30 p-4 rounded-xl border border-white/5">
      <Label className="text-white">{label}</Label>
      <p className="text-xs text-slate-400 mb-3">{description}</p>
      
      {value ? (
        <div className="relative group rounded-lg overflow-hidden border border-white/10 bg-slate-900 w-full h-32 flex items-center justify-center">
          <img src={value} alt={label} className="max-w-full max-h-full object-contain p-2" />
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Button size="sm" variant="destructive" onClick={() => handleChange(keyName, "")}>
              <X className="w-4 h-4 mr-2" /> Remove
            </Button>
          </div>
        </div>
      ) : (
        <div className="border-2 border-dashed border-white/10 hover:border-white/20 transition-colors rounded-lg w-full h-32 flex flex-col items-center justify-center text-slate-500 hover:text-slate-400 cursor-pointer bg-slate-900/50">
          <Upload className="w-6 h-6 mb-2" />
          <span className="text-sm">Upload Image</span>
          <span className="text-xs opacity-60 mt-1">SVG, PNG, or JPG</span>
          {/* Note: Real upload logic would go here */}
        </div>
      )}
      
      {/* Fallback input for URL since we don't have a real storage upload setup yet */}
      <Input 
        placeholder="Or paste image URL here..." 
        value={value} 
        onChange={(e) => handleChange(keyName, e.target.value)}
        className="mt-2 bg-slate-900/50 border-white/10 h-8 text-xs"
      />
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Colors Section */}
      <section className="space-y-4">
        <h3 className="text-lg font-medium text-white border-b border-white/10 pb-2">Brand Colors</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-2">
          {[
            { id: "color_primary", label: "Primary" },
            { id: "color_secondary", label: "Secondary" },
            { id: "color_background", label: "Background" },
            { id: "color_text", label: "Text" },
          ].map((color) => (
            <div key={color.id} className="space-y-2">
              <Label htmlFor={color.id}>{color.label}</Label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  id={color.id}
                  value={formData[color.id as keyof typeof formData]}
                  onChange={(e) => handleChange(color.id, e.target.value)}
                  className="w-10 h-10 rounded cursor-pointer bg-transparent border-0 p-0"
                />
                <Input
                  value={formData[color.id as keyof typeof formData]}
                  onChange={(e) => handleChange(color.id, e.target.value)}
                  className="bg-slate-950/50 border-white/10 focus:border-gold-500 uppercase flex-1"
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Typography Section */}
      <section className="space-y-4">
        <h3 className="text-lg font-medium text-white border-b border-white/10 pb-2">Typography</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          <div className="space-y-2">
            <Label htmlFor="font_heading">Heading Font</Label>
            <Select value={formData.font_heading} onValueChange={(val) => handleChange("font_heading", val || "")}>
              <SelectTrigger className="bg-slate-950/50 border-white/10">
                <SelectValue placeholder="Select font" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Inter">Inter (Sans-serif)</SelectItem>
                <SelectItem value="Playfair Display">Playfair Display (Serif)</SelectItem>
                <SelectItem value="Cinzel">Cinzel (Display)</SelectItem>
                <SelectItem value="Vazirmatn">Vazirmatn (Persian)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="font_body">Body Font</Label>
            <Select value={formData.font_body} onValueChange={(val) => handleChange("font_body", val || "")}>
              <SelectTrigger className="bg-slate-950/50 border-white/10">
                <SelectValue placeholder="Select font" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Roboto">Roboto</SelectItem>
                <SelectItem value="Inter">Inter</SelectItem>
                <SelectItem value="Open Sans">Open Sans</SelectItem>
                <SelectItem value="Vazirmatn">Vazirmatn (Persian)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {/* Logos Section */}
      <section className="space-y-4">
        <h3 className="text-lg font-medium text-white border-b border-white/10 pb-2">Brand Assets & Logos</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
          <LogoUploader 
            label="Light Mode Logo" 
            keyName="logo_light" 
            value={formData.logo_light} 
            description="Used on light backgrounds." 
          />
          <LogoUploader 
            label="Dark Mode Logo" 
            keyName="logo_dark" 
            value={formData.logo_dark} 
            description="Used on dark backgrounds (like the header)." 
          />
          <LogoUploader 
            label="Favicon" 
            keyName="logo_favicon" 
            value={formData.logo_favicon} 
            description="Browser tab icon (32x32px or 64x64px)." 
          />
          <LogoUploader 
            label="App Icon" 
            keyName="logo_app_icon" 
            value={formData.logo_app_icon} 
            description="Used for iOS/Android home screens (512x512px)." 
          />
          <LogoUploader 
            label="Default OG Image" 
            keyName="logo_og_image" 
            value={formData.logo_og_image} 
            description="Displayed when links are shared on social media (1200x630px)." 
          />
          <LogoUploader 
            label="Email Header Logo" 
            keyName="logo_email" 
            value={formData.logo_email} 
            description="Displayed at the top of customer emails." 
          />
          <LogoUploader 
            label="Invoice Logo" 
            keyName="logo_invoice" 
            value={formData.logo_invoice} 
            description="Used on printable invoices and packing slips." 
          />
        </div>
      </section>

      {/* Action Bar */}
      <div className="flex items-center justify-end gap-4 pt-6 border-t border-white/5">
        {saveSuccess && (
          <div className="flex items-center text-emerald-400 text-sm">
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Branding saved
          </div>
        )}
        <Button 
          onClick={handleSave} 
          disabled={isSaving}
          className="bg-gold-500 hover:bg-gold-400 text-slate-900 font-medium px-8"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Branding
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
