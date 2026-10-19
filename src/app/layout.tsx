import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "SocialGrid",
  description: "Social media posts for your business, made by our team",
  appleWebApp: { capable: true, title: "SocialGrid" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#FAF7F2",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [locale, store] = await Promise.all([getLocale(), cookies()]);
  const dark = store.get("theme")?.value === "dark";
  return (
    <html lang={locale} className={dark ? "dark" : undefined} suppressHydrationWarning>
      <head>
        {/* lets CSS hide scroll-reveal content only when JS is running to reveal it */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Mukta:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <NextIntlClientProvider>
          {children}
          <Toaster />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
