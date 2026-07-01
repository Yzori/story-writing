import type { Metadata } from "next";
import { Fraunces, Plus_Jakarta_Sans, Literata, IBM_Plex_Mono, Playfair_Display, DM_Sans, Caveat } from "next/font/google";
import Providers from "@/components/providers";
import Navbar from "@/components/shared/Navbar";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  // latin-ext for U+0131 (dotless ı) used by the wordmark's Ink-Drop "i"
  subsets: ["latin", "latin-ext"],
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

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
});

// The hand that writes in the manuscript's margins (adventure mode)
const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Quiloria — Where Stories Come Alive",
  description:
    "A collaborative writing platform where writers, artists, and readers come together to create stories that matter.",
  manifest: "/manifest.json",
  applicationName: "Quiloria",
  appleWebApp: {
    capable: true,
    title: "Quiloria",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
};

export const viewport = {
  themeColor: "#090B12",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${fraunces.variable} ${jakarta.variable} ${literata.variable} ${plexMono.variable} ${playfair.variable} ${dmSans.variable} ${caveat.variable}`} suppressHydrationWarning>
      <head>
        {/* Re-light the lamp before first paint — setTheme() only persists to
            localStorage, so without this a Vellum reader reloads into Midnight. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{document.documentElement.classList.add(localStorage.getItem("quiloria-theme")==="light"?"theme-light":"theme-dark")}catch(e){}`,
          }}
        />
      </head>
      <body className="antialiased"><Providers><Navbar />{children}</Providers></body>
    </html>
  );
}
