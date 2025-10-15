import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: {
    default: "Personal Services Hub",
    template: "%s | Personal Services Hub",
  },
  description:
    "Suite personal de herramientas para automatizar búsquedas y gestiones académicas.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="bg-slate-900">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-slate-900 text-slate-100 selection:bg-cyan-500/25 selection:text-cyan-100`}
        suppressHydrationWarning
      >
        <div className="noise-layer" aria-hidden />
        {children}
      </body>
    </html>
  );
}
