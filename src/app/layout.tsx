import type { Metadata } from "next";
import "./globals.css";
import { ScoutSite } from "@/components/ui";

export const metadata: Metadata = {
  title: "QR Hunt",
  description: "Follow the route, find the signals, and bring your team home.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="h-full">
        <ScoutSite primary="blue" secondary="orange" className="min-h-full flex flex-col">
          {children}
        </ScoutSite>
      </body>
    </html>
  );
}
