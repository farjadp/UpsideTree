"use client";

import { useState, useEffect, use } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { editCollection } from "../../actions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CollectionImageField } from "@/components/admin/CollectionImageField";
import { createClient } from "@/utils/supabase/client";

export default function EditCollectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [collection, setCollection] = useState<any>(null);
  const [nameEn, setNameEn] = useState("");
  const [nameFa, setNameFa] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");

  useEffect(() => {
    async function fetchCollection() {
      const supabase = createClient();
      const { data: dbData, error: dbError } = await supabase
        .from("collections")
        .select("*")
        .eq("id", id)
        .single();

      if (dbError || !dbData) {
        setError("Failed to fetch collection details.");
        setFetching(false);
      } else {
        setCollection(dbData);
        setNameEn(dbData.name_en || "");
        setNameFa(dbData.name_fa || "");
        setCoverImageUrl(dbData.cover_image_url || dbData.banner_image_url || "");
        setFetching(false);
      }
    }
    
    fetchCollection();
  }, [id]);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    try {
      const result = await editCollection(id, formData);
      if (result?.error) {
        setError(result.error);
        setLoading(false);
      }
    } catch (err) {
      setError("An unexpected error occurred.");
      setLoading(false);
    }
  }

  if (fetching) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
      </div>
    );
  }

  if (error && !collection) {
    return (
      <div className="max-w-3xl mx-auto p-4 bg-red-50 text-red-700 rounded-md border border-red-100">
        {error}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/admin/collections">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Edit Collection</h1>
            <p className="text-sm text-slate-400">Update collection details and images.</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 text-red-400 rounded-md border border-red-500/20">
          {error}
        </div>
      )}

      <form action={handleSubmit} className="space-y-6">
        <Card className="bg-slate-900/50 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Collection Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name_en" className="text-slate-200">Name (English)</Label>
                <Input id="name_en" name="name_en" value={nameEn} onChange={(event) => setNameEn(event.target.value)} placeholder="e.g. Minimalist Vases" required className="bg-slate-950/50 border-white/10 text-white" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name_fa" className="text-right block w-full font-persian text-slate-200">نام (فارسی)</Label>
                <Input id="name_fa" name="name_fa" value={nameFa} onChange={(event) => setNameFa(event.target.value)} placeholder="مثال: گلدان‌های مینیمال" required className="text-right bg-slate-950/50 border-white/10 text-white" dir="rtl" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug" className="text-slate-200">Slug (URL)</Label>
              <Input id="slug" name="slug" defaultValue={collection.slug} placeholder="e.g. minimalist-vases" required className="bg-slate-950/50 border-white/10 text-white" />
              <p className="text-xs text-slate-400">This will be used in the URL: /collections/slug</p>
            </div>

            <div className="space-y-2">
              <CollectionImageField
                nameEn={nameEn}
                nameFa={nameFa}
                value={coverImageUrl}
                onChange={setCoverImageUrl}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status" className="text-slate-200">Status</Label>
              <Select name="status" defaultValue={collection.status || "active"}>
                <SelectTrigger className="bg-slate-950/50 border-white/10 text-white">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button variant="outline" type="button" className="border-white/10 text-slate-300 hover:text-white" asChild>
            <Link href="/admin/collections">Cancel</Link>
          </Button>
          <Button style={{ backgroundColor: "#1D4E89" }} type="submit" disabled={loading} className="text-white">
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
