import type { Metadata } from "next";
import { AdminComingSoon, sectionNameFromSegments } from "@/components/admin/AdminComingSoon";

// Any /admin/* URL without its own page (e.g. a sidebar link to a section
// that isn't built yet) lands here instead of the storefront 404, so it
// renders inside the admin shell. Real routes always take precedence over
// this catch-all.
export const metadata: Metadata = {
  title: "Coming soon · Admin",
  robots: { index: false, follow: false },
};

export default async function AdminCatchAllPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  return <AdminComingSoon section={sectionNameFromSegments(slug)} />;
}
