import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import { MotionProvider } from "@/components/motion-provider";
import "./globals.css";

// One variable family: the width axis gives the wide signboard headlines, weight does the rest.
// next/font self-hosts it at build time, so there's no request to Google at runtime.
const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  display: "swap",
  variable: "--font-brand",
});

export const metadata: Metadata = {
  title: "StockSense",
  description: "Track shop inventory by typing plain text",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f6fa" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0e16" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${archivo.variable} h-full scroll-pt-20 scroll-pb-28 antialiased`}>
      <body className="flex min-h-full flex-col">
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
