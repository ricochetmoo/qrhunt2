import type { Metadata } from "next";

import { ScoutsNav } from "@/components/admin/admin-nav";
import { ScoutSite } from "@/components/ui";
import { requireAdminPage } from "@/server/auth/require-admin-page";

export const metadata: Metadata = {
  title: "Admin | QR Hunt",
};

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireAdminPage();

  return (
    <ScoutSite primary="dev" secondary="yellow" className="flex min-h-full flex-1 flex-col">
      <ScoutsNav>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
      </ScoutsNav>
    </ScoutSite>
  );
}
