"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageUpload } from "@/components/admin/ImageUpload";

type CollectionImageFieldProps = {
  nameEn: string;
  nameFa: string;
  value: string;
  onChange: (value: string) => void;
};

export function CollectionImageField({
  nameEn,
  nameFa,
  value,
  onChange,
}: CollectionImageFieldProps) {
  const [promptHint, setPromptHint] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [lastPrompt, setLastPrompt] = useState("");

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError("");

    try {
      const response = await fetch("/api/ai/generate/collection-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name_en: nameEn,
          name_fa: nameFa,
          prompt_hint: promptHint,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate image");
      }

      if (data.url) {
        onChange(data.url);
      }

      if (data.prompt) {
        setLastPrompt(data.prompt);
      }
    } catch (error: any) {
      setError(error.message || "Failed to generate image");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      <ImageUpload
        name="cover_image_url"
        label="Cover Image"
        folder="collections"
        value={value}
        initialImage={value}
        onChange={onChange}
      />

      <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-gold-400" />
          <Label className="text-sm text-slate-200">Generate with AI</Label>
        </div>

        <p className="text-xs text-slate-400">
          Uses Claude to shape the creative prompt and OpenAI to generate a collection banner, then saves it to your media library.
        </p>

        <Input
          value={promptHint}
          onChange={(event) => setPromptHint(event.target.value)}
          placeholder='Optional creative direction, e.g. "Lion and Sun geometric tee banner"'
          className="bg-slate-950/50 border-white/10 text-white"
        />

        <Button
          type="button"
          onClick={handleGenerate}
          disabled={isGenerating || (!nameEn.trim() && !nameFa.trim())}
          className="bg-gold-500 hover:bg-gold-400 text-slate-950"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Cover Image
            </>
          )}
        </Button>

        {error ? (
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {error}
          </div>
        ) : null}

        {lastPrompt ? (
          <div className="rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2">
            <p className="text-[11px] font-medium text-slate-300 mb-1">Generated Prompt</p>
            <p className="text-[11px] leading-5 text-slate-400">{lastPrompt}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
