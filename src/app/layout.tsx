import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StockSense",
  description: "Track shop inventory by typing plain text",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#065f46",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full scroll-pb-24 antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
