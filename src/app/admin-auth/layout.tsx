import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin | QR Hunt",
};

export default function AdminAuthLayout({ children }: LayoutProps<"/admin-auth">) {
  return children;
}
