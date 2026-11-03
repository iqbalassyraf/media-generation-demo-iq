import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { ApiKeyModal } from "./components/ApiKeyModal";

export const metadata: Metadata = {
  title: "Brand Studio · Media generation demo",
  description: "Brand-aware image and video generation",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <header className="border-b border-black/10">
          <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
            <div className="flex items-center gap-6">
              <span className="font-serif text-lg font-semibold text-[var(--brand)]">Brand Studio</span>
              <Link href="/" className="text-sm hover:underline">Studio</Link>
              <Link href="/brands" className="text-sm hover:underline">Brand kit</Link>
              <Link href="/gallery" className="text-sm hover:underline">Gallery</Link>
            </div>
            <div>
              <ApiKeyModal />
            </div>
          </nav>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
