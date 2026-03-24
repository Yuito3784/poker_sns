import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import "./globals.css";
import ErrorBoundary from "./components/ErrorBoundary";
import Providers from "./components/Providers";
import AppShell from "./components/AppShell";
import GoogleAnalytics from "./components/GoogleAnalytics";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  weight: ["400", "600", "700"],
  subsets: ["latin"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const viewport: Viewport = {
  themeColor: "#0d1009",
};

export const metadata: Metadata = {
  title: {
    default: "Poker SNS - ポーカーハンドを共有しよう",
    template: "%s | Poker SNS",
  },
  description: "ポーカーハンドを共有・議論できるSNS。プレイを振り返り、戦略を磨こう。",
  metadataBase: new URL(SITE_URL),
  openGraph: {
    type: "website",
    locale: "ja_JP",
    siteName: "Poker SNS",
    title: "Poker SNS - ポーカーハンドを共有しよう",
    description: "ポーカーハンドを共有・議論できるSNS。プレイを振り返り、戦略を磨こう。",
  },
  twitter: {
    card: "summary_large_image",
    title: "Poker SNS - ポーカーハンドを共有しよう",
    description: "ポーカーハンドを共有・議論できるSNS。プレイを振り返り、戦略を磨こう。",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "Poker SNS",
              url: SITE_URL,
              description: "ポーカーハンドを共有・議論できるSNS。プレイを振り返り、戦略を磨こう。",
              potentialAction: {
                "@type": "SearchAction",
                target: {
                  "@type": "EntryPoint",
                  urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
                },
                "query-input": "required name=search_term_string",
              },
            }),
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} antialiased`}
      >
        <GoogleAnalytics />
        <ErrorBoundary>
          <Providers><AppShell>{children}</AppShell></Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
}
