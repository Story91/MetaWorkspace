import "./theme.css";
import "@coinbase/onchainkit/styles.css";
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export async function generateMetadata(): Promise<Metadata> {
  const URL = process.env.NEXT_PUBLIC_URL;
  return {
    title: "MetaWorkspace AI - Intelligent Decentralized Workspace",
    description:
      "Revolutionary AI-powered workspace for decentralized teams. Blockchain-verified productivity, cross-DAO collaboration, and intelligent task management.",
    openGraph: {
      title: "MetaWorkspace AI - The Future of Work",
      description: "AI-powered workspace with blockchain verification. Join 10,000+ professionals building their career on-chain.",
      images: [process.env.NEXT_PUBLIC_APP_HERO_IMAGE || ""],
    },
    other: {
      "fc:miniapp": JSON.stringify({
        version: "1",
        imageUrl: process.env.NEXT_PUBLIC_APP_HERO_IMAGE,
        button: {
          title: "Launch MetaWorkspace AI",
          action: {
            type: "launch_frame",
            name: "MetaWorkspace AI",
            url: URL,
            splashImageUrl: process.env.NEXT_PUBLIC_SPLASH_IMAGE,
            splashBackgroundColor:
              process.env.NEXT_PUBLIC_SPLASH_BACKGROUND_COLOR || "#0052FF",
          },
        },
      }),
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-background">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
