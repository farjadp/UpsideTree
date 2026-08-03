"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/label";
import { UploadCloud, X, Loader2, Image as ImageIcon } from "lucide-react";

interface ImageUploadProps {
  name: string;
  label?: string;
  initialImage?: string | null;
  folder?: string;
  className?: string;
}

export function ImageUpload({ name, label, initialImage, folder = "collections", className = "" }: ImageUploadProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(initialImage || null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      return;
    }

    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", folder);
    formData.append("alt_text_en", `Upload for ${name}`);

    try {
      const res = await fetch("/api/admin/media", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Upload failed");
      }

      const data = await res.json();
      if (data.media?.url) {
        setImageUrl(data.media.url);
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred during upload.");
    } finally {
      setIsUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemove = () => {
    setImageUrl(null);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {label && <Label>{label}</Label>}
      
      {/* Hidden input to pass value to FormData */}
      <input type="hidden" name={name} value={imageUrl || ""} />

      <div className="flex items-center gap-4">
        {imageUrl ? (
          <div className="relative group w-32 h-32 rounded-lg border border-slate-200 overflow-hidden bg-slate-800 flex-shrink-0">
            <img src={imageUrl} alt="Uploaded preview" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Button
                type="button"
                variant="destructive"
                size="icon"
                onClick={handleRemove}
                className="h-8 w-8 rounded-full"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="w-32 h-32 rounded-lg border-2 border-dashed border-slate-700 bg-slate-900/50 flex flex-col items-center justify-center text-slate-500 flex-shrink-0">
            <ImageIcon className="h-8 w-8 mb-2 opacity-50" />
            <span className="text-xs font-medium">No image</span>
          </div>
        )}

        <div className="flex-1 space-y-2">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileChange}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="w-full sm:w-auto"
          >
            {isUploading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <UploadCloud className="w-4 h-4 mr-2" />
            )}
            {imageUrl ? "Change Image" : "Upload Image"}
          </Button>
          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
          <p className="text-xs text-slate-500 mt-1">Recommended size: 1200x800px. Max size: 2MB.</p>
        </div>
      </div>
    </div>
  );
}
