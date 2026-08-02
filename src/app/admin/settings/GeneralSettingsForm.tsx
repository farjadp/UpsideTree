"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Loader2, CheckCircle2 } from "lucide-react";

interface Setting {
  id?: string;
  key: string;
  value: string;
  value_type: string;
  label_en: string;
  description?: string;
}

interface GeneralSettingsFormProps {
  initialSettings: Record<string, Setting>;
}

export default function GeneralSettingsForm({ initialSettings }: GeneralSettingsFormProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Initialize state with default values if setting doesn't exist
  const [formData, setFormData] = useState({
    store_name: initialSettings.store_name?.value || "Upside Tree",
    contact_email: initialSettings.contact_email?.value || "",
    support_email: initialSettings.support_email?.value || "",
    phone_number: initialSettings.phone_number?.value || "",
    timezone: initialSettings.timezone?.value || "UTC",
    currency: initialSettings.currency?.value || "USD",
  });

  const handleChange = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      // Define metadata for the settings
      const settingsMetadata = {
        store_name: { label_en: "Store Name", value_type: "string", description: "The public name of your store." },
        contact_email: { label_en: "Contact Email", value_type: "string", description: "Email used for store communications." },
        support_email: { label_en: "Support Email", value_type: "string", description: "Email displayed to customers for support." },
        phone_number: { label_en: "Phone Number", value_type: "string", description: "Store phone number." },
        timezone: { label_en: "Timezone", value_type: "string", description: "Primary timezone for the store." },
        currency: { label_en: "Default Currency", value_type: "string", description: "Default currency for prices." },
      };

      // Save each setting
      const promises = Object.entries(formData).map(async ([key, value]) => {
        const meta = settingsMetadata[key as keyof typeof settingsMetadata];
        const res = await fetch("/api/admin/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            namespace: "general",
            key,
            value,
            value_type: meta.value_type,
            label_en: meta.label_en,
            description: meta.description,
            is_public: true,
          }),
        });

        if (!res.ok) {
          throw new Error(`Failed to save ${key}`);
        }
      });

      await Promise.all(promises);
      setSaveSuccess(true);
      
      // Auto-hide success message
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("Failed to save settings. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Store Details Section */}
      <section className="space-y-4">
        <h3 className="text-lg font-medium text-white border-b border-white/10 pb-2">Store Details</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          <div className="space-y-2">
            <Label htmlFor="store_name">Store Name</Label>
            <Input
              id="store_name"
              value={formData.store_name}
              onChange={(e) => handleChange("store_name", e.target.value)}
              className="bg-slate-950/50 border-white/10 focus:border-gold-500"
            />
            <p className="text-xs text-slate-500">The public name of your store.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone_number">Phone Number</Label>
            <Input
              id="phone_number"
              type="tel"
              value={formData.phone_number}
              onChange={(e) => handleChange("phone_number", e.target.value)}
              className="bg-slate-950/50 border-white/10 focus:border-gold-500"
              placeholder="+1 (555) 000-0000"
            />
            <p className="text-xs text-slate-500">Optional store phone number.</p>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="space-y-4">
        <h3 className="text-lg font-medium text-white border-b border-white/10 pb-2">Contact Information</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          <div className="space-y-2">
            <Label htmlFor="contact_email">Sender Email</Label>
            <Input
              id="contact_email"
              type="email"
              value={formData.contact_email}
              onChange={(e) => handleChange("contact_email", e.target.value)}
              className="bg-slate-950/50 border-white/10 focus:border-gold-500"
              placeholder="noreply@upsidetree.com"
            />
            <p className="text-xs text-slate-500">The email address your store uses to send automated emails.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="support_email">Support Email</Label>
            <Input
              id="support_email"
              type="email"
              value={formData.support_email}
              onChange={(e) => handleChange("support_email", e.target.value)}
              className="bg-slate-950/50 border-white/10 focus:border-gold-500"
              placeholder="support@upsidetree.com"
            />
            <p className="text-xs text-slate-500">The email address displayed to customers for support inquiries.</p>
          </div>
        </div>
      </section>

      {/* Formatting Section */}
      <section className="space-y-4">
        <h3 className="text-lg font-medium text-white border-b border-white/10 pb-2">Standards & Formats</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Select value={formData.timezone} onValueChange={(val) => handleChange("timezone", val)}>
              <SelectTrigger className="bg-slate-950/50 border-white/10">
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="UTC">UTC (Coordinated Universal Time)</SelectItem>
                <SelectItem value="America/New_York">Eastern Time (US & Canada)</SelectItem>
                <SelectItem value="America/Chicago">Central Time (US & Canada)</SelectItem>
                <SelectItem value="America/Denver">Mountain Time (US & Canada)</SelectItem>
                <SelectItem value="America/Los_Angeles">Pacific Time (US & Canada)</SelectItem>
                <SelectItem value="America/Toronto">Toronto, Canada</SelectItem>
                <SelectItem value="Asia/Tehran">Tehran, Iran</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500">Used to calculate order dates and scheduled content.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="currency">Store Currency</Label>
            <Select value={formData.currency} onValueChange={(val) => handleChange("currency", val)}>
              <SelectTrigger className="bg-slate-950/50 border-white/10">
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD - US Dollar</SelectItem>
                <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                <SelectItem value="EUR">EUR - Euro</SelectItem>
                <SelectItem value="GBP">GBP - British Pound</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500">Default currency for all products. Modifying this does not convert existing prices.</p>
          </div>
        </div>
      </section>

      {/* Action Bar */}
      <div className="flex items-center justify-end gap-4 pt-6 border-t border-white/5">
        {saveSuccess && (
          <div className="flex items-center text-emerald-400 text-sm">
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Settings saved successfully
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
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
