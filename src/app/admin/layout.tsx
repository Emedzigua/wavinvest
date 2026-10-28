import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "../globals.css";
import "./admin.css";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500"],
  display: "swap",
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: { default: "Administrácia", template: "%s · WAV Invest admin" },
  robots: { index: false, follow: false },
  // Installable on the phone home screen (needed for iPhone notifications)
  manifest: "/admin.webmanifest",
  appleWebApp: { capable: true, title: "WAV Admin", statusBarStyle: "default" },
  icons: { apple: "/icons/admin-180.png" },
};

export const viewport: Viewport = { themeColor: "#322d2a" };

export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  return (
    <html lang="sk" className={inter.variable}>
      <body className="adm">{children}</body>
    </html>
  );
}
