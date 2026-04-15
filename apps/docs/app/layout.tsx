import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "UIGen — A runtime frontend for any OpenAPI described API",
  description:
    "UIGen generates a fully functional frontend from any OpenAPI or Swagger spec at runtime. Optional code, optional config. Tables, forms, auth, and pagination — no boilerplate.",
  keywords: [
    "OpenAPI frontend generator",
    "Swagger UI alternative",
    "OpenAPI to UI",
    "runtime frontend generator",
    "OpenAPI React UI",
    "API frontend from spec",
    "zero boilerplate frontend",
    "UIGen",
  ],
  openGraph: {
    title: "UIGen — A runtime frontend for any OpenAPI described API",
    description:
      "Point it at an OpenAPI spec. Get a fully functional frontend. Optional code, optional config.",
    type: "website",
    url: "https://uigen.dev",
  },
  twitter: {
    card: "summary_large_image",
    title: "UIGen — A runtime frontend for any OpenAPI described API",
    description:
      "Point it at an OpenAPI spec. Get a fully functional frontend. Optional code, optional config.",
  },
  alternates: {
    canonical: "https://uigen.dev",
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
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
