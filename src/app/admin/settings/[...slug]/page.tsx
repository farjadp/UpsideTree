import type { Metadata } from "next";
import { AdminComingSoon, sectionNameFromSegments } from "@/components/admin/AdminComingSoon";

// Settings sub-pages that aren't built yet render inside the settings layout
// (so the settings nav stays visible) rather than the admin-wide catch-all.
export const metadata: Metadata = {
  title: "Coming soon · Settings",
  robots: { index: false, follow: false },
};

export default async function SettingsCatchAllPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  return (
    <AdminComingSoon
      compact
      section={`${sectionNameFromSegments(slug)} settings`}
      description="These settings aren't available yet, so there's nothing to configure here. Check back once they ship."
      secondaryHref="/admin/settings"
      secondaryLabel="General settings"
    />
  );
}
