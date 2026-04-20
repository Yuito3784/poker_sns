import type { Metadata, Viewport } from "next";
import "./globals.css";
import ErrorBoundary from "./components/ErrorBoundary";
import Providers from "./components/Providers";
import AppShell from "./components/AppShell";
import GoogleAnalytics from "./components/GoogleAnalytics";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const viewport: Viewport = {
  themeColor: "#0d1009",
};

export const metadata: Metadata = {
  title: {
    default: "PokerTALK - テーブルの外でも、ポーカーを語ろう",
    template: "%s | PokerTALK",
  },
  description: "セッション帰りに今日のハンドを語る。ライブポーカープレイヤーのためのSNS。",
  metadataBase: new URL(SITE_URL),
  openGraph: {
    type: "website",
    locale: "ja_JP",
    siteName: "PokerTALK",
    title: "PokerTALK - テーブルの外でも、ポーカーを語ろう",
    description: "セッション帰りに今日のハンドを語る。ライブポーカープレイヤーのためのSNS。",
  },
  twitter: {
    card: "summary_large_image",
    title: "PokerTALK - テーブルの外でも、ポーカーを語ろう",
    description: "セッション帰りに今日のハンドを語る。ライブポーカープレイヤーのためのSNS。",
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
              name: "PokerTALK",
              url: SITE_URL,
              description: "セッション帰りに今日のハンドを語る。ライブポーカープレイヤーのためのSNS。",
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
      <body className="antialiased">
        <GoogleAnalytics />
        <ErrorBoundary>
          <Providers><AppShell>{children}</AppShell></Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
}
