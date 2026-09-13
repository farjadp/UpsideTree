import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { configuredPlatforms, isAutopostEnabled } from "@/lib/social/autopost";
import { SOCIAL_PLATFORMS, type SocialPlatform } from "@/lib/social/types";
import { createClient } from "@/utils/supabase/server";
import { RunQueueButton, SocialRowActions } from "./SocialActions";

// "Post next product now" runs a full generate-and-post cycle in the server action.
export const maxDuration = 300;

type AssetRow = {
  product_id: string;
  status: string;
  image_url: string | null;
  attempts: number;
  error: string | null;
  updated_at: string;
  products: { name_en: string; slug: string } | null;
};

type PostRow = {
  product_id: string;
  platform: SocialPlatform;
  status: string;
  external_url: string | null;
  error: string | null;
};

const PLATFORM_LABELS: Record<SocialPlatform, string> = {
  instagram: "Instagram",
  telegram: "Telegram",
  pinterest: "Pinterest",
};

const STATUS_STYLES: Record<string, string> = {
  queued: "bg-lapis-50 text-lapis-700",
  done: "bg-emerald-50 text-emerald-700",
  failed: "bg-red-50 text-red-700",
  skipped: "bg-gray-100 text-gray-500",
};

export default async function AdminChannelsPage() {
  const supabase = await createClient();
  const enabled = isAutopostEnabled();
  const platforms = configuredPlatforms();

  const [{ data: assetRows, error }, { data: postRows }] = await Promise.all([
    supabase
      .from("social_assets")
      .select("product_id, status, image_url, attempts, error, updated_at, products(name_en, slug)")
      .order("updated_at", { ascending: false })
      .limit(100),
    supabase.from("social_posts").select("product_id, platform, status, external_url, error"),
  ]);

  const assets = (assetRows ?? []) as unknown as AssetRow[];
  const posts = new Map<string, PostRow>();
  for (const post of (postRows ?? []) as PostRow[]) posts.set(`${post.product_id}:${post.platform}`, post);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Social Channels</h1>
          <p className="text-sm text-gray-500">
            New active products get a branded image and bilingual captions, then post to each connected channel.
          </p>
        </div>
        <RunQueueButton />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium uppercase text-gray-500">Auto-posting</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={enabled ? "text-2xl font-bold text-emerald-700" : "text-2xl font-bold text-gray-400"}>
              {enabled ? "On" : "Off"}
            </div>
            {!enabled && <p className="mt-1 text-sm text-gray-500">Set SOCIAL_AUTOPOST_ENABLED=true</p>}
          </CardContent>
        </Card>
        {SOCIAL_PLATFORMS.map((platform) => (
          <Card key={platform}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium uppercase text-gray-500">{PLATFORM_LABELS[platform]}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={platforms.includes(platform) ? "text-2xl font-bold text-gray-900" : "text-2xl font-bold text-gray-400"}>
                {platforms.includes(platform) ? "Connected" : "Not set up"}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Posts</CardTitle>
          <CardDescription>
            Products wait {process.env.SOCIAL_AUTOPOST_DELAY_MINUTES || 30} minutes after going active before posting, and
            failures retry up to 3 times.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && <p className="mb-4 text-sm text-red-600">Couldn&apos;t load the queue: {error.message}</p>}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Image</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Channels</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-gray-500">
                    Nothing queued yet. Products appear here when they go active.
                  </TableCell>
                </TableRow>
              ) : (
                assets.map((asset) => (
                  <TableRow key={asset.product_id}>
                    <TableCell>
                      {asset.image_url ? (
                        <a href={asset.image_url} target="_blank" rel="noreferrer">
                          {/* eslint-disable-next-line @next/next/no-img-element -- generated image in Supabase storage */}
                          <img src={asset.image_url} alt="" className="h-20 w-16 rounded-md object-cover" />
                        </a>
                      ) : (
                        <div className="h-20 w-16 rounded-md bg-gray-100" />
                      )}
                    </TableCell>
                    <TableCell className="max-w-xs">
                      {asset.products ? (
                        <Link href={`/products/${asset.products.slug}`} target="_blank" className="font-medium text-gray-900 hover:underline">
                          {asset.products.name_en}
                        </Link>
                      ) : (
                        <span className="text-gray-400">Deleted product</span>
                      )}
                      {asset.error && <p className="mt-1 whitespace-normal text-xs text-red-600">{asset.error}</p>}
                    </TableCell>
                    <TableCell>
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${STATUS_STYLES[asset.status] ?? STATUS_STYLES.skipped}`}>
                        {asset.status}
                        {asset.attempts > 0 && asset.status === "failed" ? ` (${asset.attempts}/3)` : ""}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        {SOCIAL_PLATFORMS.map((platform) => {
                          const post = posts.get(`${asset.product_id}:${platform}`);
                          if (!post) return null;
                          const style = post.status === "posted" ? "text-emerald-700" : "text-red-700";
                          return post.external_url ? (
                            <a key={platform} href={post.external_url} target="_blank" rel="noreferrer" className={`text-xs font-medium underline ${style}`}>
                              {PLATFORM_LABELS[platform]}
                            </a>
                          ) : (
                            <span key={platform} title={post.error ?? undefined} className={`text-xs font-medium ${style}`}>
                              {PLATFORM_LABELS[platform]}
                            </span>
                          );
                        })}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <SocialRowActions productId={asset.product_id} status={asset.status} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
