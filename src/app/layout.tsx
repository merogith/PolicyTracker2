import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Sidebar } from "@/components/shell/sidebar";
import { STATIC_DEMO } from "@/lib/static-demo";
import "./globals.css";
import "@/components/charts/score-presentation.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Every page shows live job and result state from the database.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Policy Tracker",
  description: "Climate and disaster policy documents, analysed per domain with page-numbered quotes",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      {/* Grammarly can add body attributes before hydration; child mismatches still warn. */}
      <body className="min-h-full lg:flex" suppressHydrationWarning>
        <Sidebar />
        <main className="min-w-0 flex-1 px-4 pt-5 pb-16 sm:px-6 lg:px-10 lg:pt-8">
          <div className="mx-auto max-w-[88rem]">
            {STATIC_DEMO && (
              <p className="mb-4 rounded-lg bg-warn-soft px-3 py-2 text-xs text-warn-ink">
                Read-only snapshot of the current reports{process.env.NEXT_PUBLIC_SNAPSHOT_DATE ? ` (${process.env.NEXT_PUBLIC_SNAPSHOT_DATE})` : ""}. Uploading, re-running analysis and editing are turned off.
              </p>
            )}
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
