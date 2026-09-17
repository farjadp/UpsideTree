import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { configuredPlatforms, isAutopostEnabled } from "@/lib/social/autopost";
import { SOCIAL_PLATFORMS, type SocialPlatform } from "@/lib/social/types";
import {
  ADMIN_PAGE_SIZE,
  AdminPagination,
  isRangeNotSatisfiable,
  pageRange,
  parsePage,
} from "@/components/admin/AdminPagination";
import { createClient } from "@/utils/supabase/server";
import { RunQueueButton, SocialRowActions } from "./SocialActions";

// "Post next product now" runs a full generate-and-post cycle in the server action.
export const maxDuration = 300;

type AssetRow = {
  product_id: string;
  status: string;
  image_url: string | null;
  slide_urls: string[] | null;
  attempts: number;
  error: string | null;
  locked_at: string | null;
  updated_at: string;
  runners_up: number[] | null;
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
  copy_review: "bg-gold-50 text-gold-700",
  copy_approved: "bg-lapis-50 text-lapis-700",
  review: "bg-gold-50 text-gold-700",
  approved: "bg-lapis-50 text-lapis-700",
  rejected: "bg-gray-100 text-gray-500",
  done: "bg-emerald-50 text-emerald-700",
  failed: "bg-red-50 text-red-700",
  blocked: "bg-pomegranate-50 text-pomegranate-700",
  posting: "bg-gold-50 text-gold-700",
  skipped: "bg-gray-100 text-gray-500",
};

// A run holds the lock for at most 15 minutes; a fresher lock means it's being generated or posted right now.
function displayStatus(asset: AssetRow) {
  const locked = asset.locked_at && Date.now() - new Date(asset.locked_at).getTime() < 15 * 60_000;
  return locked ? "posting" : asset.status;
}

const STATUS_FILTERS = ["all", "copy_review", "review", "queued", "copy_approved", "approved", "blocked", "failed", "done", "rejected", "skipped"] as const;

const STATUS_LABELS: Record<string, string> = {
  copy_review: "text review",
  copy_approved: "making images",
  review: "final review",
};

export default async function AdminChannelsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const { status: statusParam, page: pageParam } = await searchParams;
  const status = STATUS_FILTERS.find((value) => value === statusParam) ?? "all";
  const page = parsePage(pageParam);
  const { from, to } = pageRange(page);

  const supabase = await createClient();
  const enabled = isAutopostEnabled();
  const platforms = configuredPlatforms();

  let query = supabase
    .from("social_assets")
    .select("product_id, status, image_url, slide_urls, attempts, error, locked_at, updated_at, runners_up:copy->runners_up, products(name_en, slug)", {
      count: "exact",
    })
    .order("updated_at", { ascending: false })
    .range(from, to);
  if (status !== "all") query = query.eq("status", status);
  const { data: assetRows, error: queryError, count } = await query;
  if (isRangeNotSatisfiable(queryError)) redirect(status === "all" ? "/admin/channels" : `/admin/channels?status=${status}`);
  const error = queryError;

  const assets = (assetRows ?? []) as unknown as AssetRow[];
  const { data: postRows } = assets.length
    ? await supabase
        .from("social_posts")
        .select("product_id, platform, status, external_url, error")
        .in("product_id", assets.map((asset) => asset.product_id))
    : { data: [] };
  const posts = new Map<string, PostRow>();
  for (const post of (postRows ?? []) as PostRow[]) posts.set(`${post.product_id}:${post.platform}`, post);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Social Channels</h1>
          <p className="text-sm text-gray-500">
            New active products get a story and bilingual captions for the founder to approve, then images and slides for a
            second approval (Telegram or here), then post to each connected channel.
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
          <div className="mb-4 flex flex-wrap gap-2">
            {STATUS_FILTERS.map((value) => (
              <Link
                key={value}
                href={value === "all" ? "/admin/channels" : `/admin/channels?status=${value}`}
                className={
                  value === status
                    ? "rounded-full bg-lapis-700 px-3 py-1 text-xs font-medium capitalize text-white"
                    : "rounded-full bg-gray-100 px-3 py-1 text-xs font-medium capitalize text-gray-600 hover:bg-gray-200"
                }
              >
                {STATUS_LABELS[value] ?? value}
              </Link>
            ))}
          </div>
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
                      {(asset.slide_urls?.length ?? 0) > 1 && (
                        <p className="mt-1 text-center text-[11px] text-gray-500">{asset.slide_urls!.length} slides</p>
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
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${STATUS_STYLES[displayStatus(asset)] ?? STATUS_STYLES.skipped}`}>
                        {displayStatus(asset) === "posting" ? "working…" : (STATUS_LABELS[asset.status] ?? asset.status)}
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
                      <SocialRowActions
                        productId={asset.product_id}
                        status={asset.status}
                        alternatives={Array.isArray(asset.runners_up) ? asset.runners_up.length : 0}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <div className="mt-4 border-t">
            <AdminPagination
              tone="light"
              page={page}
              total={count ?? 0}
              pageSize={ADMIN_PAGE_SIZE}
              basePath="/admin/channels"
              searchParams={status === "all" ? {} : { status }}
              itemLabel="products"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
