import type { Metadata } from "next";
import { Fraunces, Plus_Jakarta_Sans, Literata, IBM_Plex_Mono } from "next/font/google";
import Providers from "@/components/Providers";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
});

const literata = Literata({
  variable: "--font-literata",
  subsets: ["latin"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  weight: ["400", "500"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Inkwell — Where Stories Come Alive",
  description:
    "A collaborative writing platform where writers, artists, and readers come together to create stories that matter.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${fraunces.variable} ${jakarta.variable} ${literata.variable} ${plexMono.variable}`}>
      <body className="antialiased"><Providers>{children}</Providers></body>
    </html>
  );
}
