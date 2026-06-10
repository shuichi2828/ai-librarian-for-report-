import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Librarian",
  description: "Bilingual academic reference finder for university reports"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
