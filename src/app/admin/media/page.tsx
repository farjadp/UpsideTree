import { parsePage, type AdminSearchParams } from "@/components/admin/AdminPagination";
import { MediaLibrary } from "./MediaLibrary";

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";

export default async function MediaLibraryPage({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  const params = await searchParams;

  return (
    <MediaLibrary
      page={parsePage(params.page)}
      folder={first(params.folder) || "all"}
      fileType={first(params.type) || "all"}
      search={first(params.q)}
    />
  );
}
