import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { THEME_BOOTSTRAP_SCRIPT } from "@/lib/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "DriverCompass — Know the employer. Choose your next move.",
    template: "%s · DriverCompass",
  },
  description:
    "A driver-first professional marketplace: compare European transport employers on pay, rotation, home time and accommodation, read reviews from drivers who worked there, and contact the employer directly.",
  applicationName: "DriverCompass",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/brand/favicon.svg", type: "image/svg+xml" },
      { url: "/brand/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/brand/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: { capable: true, title: "DriverCompass", statusBarStyle: "default" },
  openGraph: {
    title: "DriverCompass — Know the employer. Choose your next move.",
    description:
      "Compare transport employers on the conditions that decide a job, then contact them directly.",
    siteName: "DriverCompass",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f5f1" },
    { media: "(prefers-color-scheme: dark)", color: "#0a1420" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      data-type="software"
      data-radius="soft"
      data-buttons="pill"
      data-ground="sand"
      data-motion=""
      suppressHydrationWarning
    >
      <head>
        {/*
         * Runs during HTML parsing, before first paint, so the stored theme is
         * already applied when the document is first rendered.
         */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }} />
      </head>
      <body className="min-h-dvh font-sans antialiased">{children}</body>
    </html>
  );
}
