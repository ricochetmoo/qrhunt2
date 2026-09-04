import type { Metadata } from "next";

import { ComponentLibraryShowcase } from "./showcase";

export const metadata: Metadata = {
  title: "QR Hunt",
  description: "Reusable Scouts-inspired UI components for QR Hunt.",
};

export default function ComponentsPage() {
  return <ComponentLibraryShowcase />;
}
