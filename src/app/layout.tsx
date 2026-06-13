import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { AnalyticsHealthCheck } from "@/components/analytics-health-check";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Report Builder",
  description: "Bilingual report writing assistant for university students",
  icons: {
    icon: "/app-icon.svg",
    apple: "/app-icon.svg"
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>
        {children}
        <AnalyticsHealthCheck />
        <Analytics />
      </body>
    </html>
  );
}
