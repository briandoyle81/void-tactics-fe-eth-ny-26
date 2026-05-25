import type { Metadata } from "next";
import { Rajdhani, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Toaster } from "react-hot-toast";

const rajdhani = Rajdhani({
  variable: "--font-rajdhani",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://voidtactics.xyz";

const defaultPageTitle =
  "Void Tactics | Fully Onchain Turn-Based PvP Fleet Game";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  manifest: "/favicon/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon/favicon.ico" },
      { url: "/favicon/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    shortcut: ["/favicon.ico"],
    apple: [
      {
        url: "/favicon/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
  title: {
    default: defaultPageTitle,
    template: "%s | Void Tactics",
  },
  description:
    "A fully onchain strategic PvP fleet game: turn-based battles on a tactical grid where positioning, weapons range, and target priority decide the fight. Build and mint ships, draft fleets, join lobbies, and settle matches onchain. Don't play to earn, play to win.",
  applicationName: "Void Tactics",
  keywords: [
    "Void Tactics",
    "voidtactics",
    "Web3",
    "onchain game",
    "fully onchain",
    "PvP",
    "turn-based",
    "tactical grid",
    "strategy",
    "fleet combat",
  ],
  authors: [{ name: "Void Tactics", url: siteUrl }],
  openGraph: {
    title: defaultPageTitle,
    description:
      "Fully onchain turn-based PvP fleet tactics on a grid. Maneuver ships, control range, and fight for resources. Don't play to earn, play to win.",
    url: siteUrl,
    siteName: "Void Tactics",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/img/og-image.png",
        width: 1200,
        height: 630,
        alt: "Void Tactics",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: defaultPageTitle,
    description:
      "Fully onchain turn-based PvP fleet tactics on a grid. Maneuver ships, control range, and fight for resources. Don't play to earn, play to win.",
    creator: "@voidtacticsxyz",
    site: "@voidtacticsxyz",
    images: ["/img/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
  // Talent App domain / project verification (public token, non-executable).
  other: {
    "talentapp:project_verification":
      "ccd99a570185c2fec7a44930dc3b30732f617a6bd4390ebcff5c3f16e020448312fd63176d45ad22493038ef29dd21349e6c9169bc365e484ded9857e07b5a98",
    "base:app_id": "69e9124356caa7489826f553",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${rajdhani.variable} ${jetbrainsMono.variable}`}
      >
        <Providers>{children}</Providers>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: "#1a2430",
              color: "#e2e8f0",
              border: "2px solid #223041",
              borderRadius: "0",
              fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            },
          }}
        />
      </body>
    </html>
  );
}
