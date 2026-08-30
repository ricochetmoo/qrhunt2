import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Lost Signal · QR Hunt",
  description: "Follow the route, find the signals, and bring your team home.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
