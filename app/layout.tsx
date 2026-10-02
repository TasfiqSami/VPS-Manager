import type { Metadata, Viewport } from "next";

import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/toaster";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Vantage — VPS Control",
    template: "%s · Vantage",
  },
  description:
    "Vantage is a secure, premium control panel for Virtualizor end-user VPS accounts. Monitor, manage and operate your server from one refined console.",
  applicationName: "Vantage",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#05060e" },
    { media: "(prefers-color-scheme: light)", color: "#f5f7fb" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-dvh bg-canvas text-content antialiased">
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
