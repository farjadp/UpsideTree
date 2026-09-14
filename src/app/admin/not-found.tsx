import { AdminComingSoon } from "@/components/admin/AdminComingSoon";

// Rendered inside the admin layout when an admin page calls notFound()
// (e.g. an order or product id that doesn't exist).
export default function AdminNotFound() {
  return (
    <AdminComingSoon
      section="Not found"
      title="Nothing here"
      description="This record doesn't exist or was removed. Head back to the dashboard to keep going."
    />
  );
}
