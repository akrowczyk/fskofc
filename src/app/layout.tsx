import type { Metadata } from "next";
import { Geist_Mono, Roboto, Roboto_Serif } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

/** Matches kofc10325.org: Roboto (body), Roboto Serif (headings) */
const roboto = Roboto({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const robotoSerif = Roboto_Serif({
  variable: "--font-head",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "FS Companion · Council 10325",
    template: "%s · FS Companion",
  },
  description:
    "Private Financial Secretary operations cockpit for Holy Ghost Council 10325 — contact DB, deadlines, retention, correspondence. Not a system of record.",
  robots: { index: false, follow: false },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/logo_web.png", type: "image/png" },
    ],
    apple: "/logo_web.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${roboto.variable} ${robotoSerif.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
