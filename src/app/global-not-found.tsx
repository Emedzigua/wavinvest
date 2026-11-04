import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import Logo from "@/components/Logo";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500"],
  display: "swap",
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "404 — WAV Invest",
  robots: { index: false },
};

// No language is known here. The home link lets the site pick the visitor's own.
export default function GlobalNotFound() {
  return (
    <html lang="sk" className={inter.variable}>
      <body>
        <main className="container lost">
          <Logo on="light" />
          <h1 className="display">Stránka sa nenašla</h1>
          <p className="lead" lang="en">
            Page not found. The link may be old or mistyped.
          </p>
          <Link href="/" className="btn btn--dark">
            WAV Invest →
          </Link>
        </main>
      </body>
    </html>
  );
}
