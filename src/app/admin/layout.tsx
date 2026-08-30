import { AdminNav } from "@/components/admin/admin-nav";
import { requireAdminPage } from "@/server/auth/require-admin-page";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireAdminPage();

  return (
    <div className="flex min-h-full flex-1 flex-col bg-slate-50">
      <AdminNav />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
