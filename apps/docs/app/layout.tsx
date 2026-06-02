import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "./providers";
import { PostHogPageView } from "./posthog-pageview";
import { Suspense } from "react";
import { absoluteUrl } from "../lib/site";
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
  metadataBase: new URL(absoluteUrl()),
  title: "UIGen - Build & Run Declarative UI Apps from OpenAPI. No Codegen.",
  description:
    "OpenAPI is your foundation. No codegen. Point UIGen at a spec and get tables, forms, auth, charts, and live WebSocket streams at runtime. Optional config, optional overrides.",
  keywords: [
    "OpenAPI frontend generator",
    "declarative UI apps",
    "OpenAPI no codegen",
    "Swagger UI alternative",
    "OpenAPI to UI",
    "OpenAPI charts",
    "OpenAPI admin panel",
    "OpenAPI dashboard",
    "live WebSocket UI",
    "runtime UI from spec",
    "OpenAPI React UI",
    "UIGen",
  ],
  openGraph: {
    title: "UIGen - Build & Run Declarative UI Apps from OpenAPI. No Codegen.",
    description:
      "OpenAPI is your foundation. No codegen. Point UIGen at a spec and get tables, forms, auth, charts, and live WebSocket streams at runtime.",
    type: "website",
    url: absoluteUrl(),
  },
  twitter: {
    card: "summary_large_image",
    title: "UIGen - Build & Run Declarative UI Apps from OpenAPI. No Codegen.",
    description:
      "OpenAPI is your foundation. No codegen. Point UIGen at a spec and get tables, forms, auth, charts, and live WebSocket streams at runtime.",
  },
  alternates: {
    canonical: absoluteUrl(),
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
        <Providers>
          <Suspense fallback={null}>
            <PostHogPageView />
          </Suspense>
          {children}
        </Providers>
      </body>
    </html>
  );
}
