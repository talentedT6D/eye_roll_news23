import type { Metadata, Viewport } from "next";
import { Inter, Source_Serif_4 } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const serif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  title: "Eye Roll News",
  description:
    "Scoff at every false promise. Eye Roll News lets you scroll with your eyes and bring back tasteful disdain for pathetic attempts at votes.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Eye Roll News",
  },
  openGraph: {
    title: "Eye Roll News",
    description:
      "Scoff at every false promise. Scroll with your eyes. Bring back tasteful disdain.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#111111",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${serif.variable}`}>
      <body className="bg-cream text-ink antialiased">{children}</body>
    </html>
  );
}
