import type { Metadata } from "next";
import "./globals.css";
import { I18nProvider } from "@/i18n/I18nProvider";
import Navbar from "@/components/Navbar";
import CompareBar from "@/components/CompareBar";
import SelectState from "@/components/SelectState";

export const metadata: Metadata = {
  title: "Vaya — Your AI Loan Advisor",
  description:
    "Vaya is a conversational AI that helps you find the right loan and compare official products across 20+ Vietnamese banks. Private, unbiased, and free.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // `suppressHydrationWarning`: the inline script below rewrites `lang` before
    // React hydrates, which is intentional.
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* "Be Vietnam Pro" carries the full Vietnamese diacritic set that Sora
            lacks — see the html[lang="vi"] override in globals.css. */}
        <link
          href="https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700;800&family=Be+Vietnam+Pro:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Noto+Sans+SC:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
        {/* Applies the saved language to <html lang> before the first paint, so
            the right font is used immediately and nothing flashes. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var v=localStorage.getItem('vaya_lang');if(v==='vi'||v==='zh'||v==='en'){document.documentElement.lang=v;}}catch(e){}})();",
          }}
        />
      </head>
      <body>
        <I18nProvider>
          <Navbar />
          {children}
          {/* Selection basket for the compare feature — lives above every page so
              a pick made on the markets table survives navigation. */}
          <CompareBar />
          {/* Tracks which native <select> is open so its chevron can point up. */}
          <SelectState />
        </I18nProvider>
      </body>
    </html>
  );
}
