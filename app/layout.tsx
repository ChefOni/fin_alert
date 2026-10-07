import type { Metadata } from "next";
import Link from "next/link";
import { Google_Sans, Google_Sans_Code, Literata } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { FeedbackWidget } from "./feedback-widget";

const googleSans = Google_Sans({ variable: "--font-google-sans", subsets: ["latin"], adjustFontFallback: false });
const literata = Literata({ variable: "--font-literata", subsets: ["latin"], style: ["normal"], adjustFontFallback: false });
const googleSansCode = Google_Sans_Code({ variable: "--font-google-sans-code", subsets: ["latin"], adjustFontFallback: false });

export const metadata: Metadata = {
  title: "Fin Alert — live status of Nigerian fintech infrastructure",
  description:
    "One place for Nigerian fintech teams to see live health of the rails they build on — payment processors like Paystack and Flutterwave, plus other payment instruments like KYC/identity checks, cards and remittances — with failover webhooks.",
};

function BrandMark() {
  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-background">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 12h4l2.5-6 4 12 2.5-6H21" />
      </svg>
    </span>
  );
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
      <html lang="en" className={`${googleSans.variable} ${literata.variable} ${googleSansCode.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <div aria-hidden className="grid-backdrop" />
        <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur-md">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-3.5">
            <Link href="/" className="flex items-center gap-2.5">
              <BrandMark />
              <span className="font-serif text-lg leading-none">Fin Alert</span>
            </Link>
            <nav className="flex items-center gap-6 text-sm font-medium text-muted-foreground">
              <Link href="/" className="transition-colors hover:text-foreground">Overview</Link>
              <Link href="/status" className="transition-colors hover:text-foreground">Status</Link>
              <Link href="/#webhooks" className="flex items-center gap-1.5 transition-colors hover:text-foreground">
                Webhooks
                <span className="rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-700">Soon</span>
              </Link>
              <Link href="/#coverage" className="transition-colors hover:text-foreground">Coverage</Link>
              <Link href="/sandbox" className="transition-colors hover:text-foreground">Sandbox</Link>
            </nav>
          </div>
        </header>

        <div className="flex-1">{children}</div>

        <footer className="border-t border-border">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-6 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span>Fin Alert — independent, Nigeria-focused uptime signal.</span>
            <span>Not affiliated with any listed provider. Signal, not a guarantee.</span>
          </div>
        </footer>

        <FeedbackWidget />
        <Analytics />
      </body>
    </html>
  );
}
