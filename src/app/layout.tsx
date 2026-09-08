import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "लेखा जोखा Enterprise | Multi-Tenant GST ERP & AI POS",
  description: "Next-Gen Multi-Tenant GST Billing, Accounting, Khata, Inventory & POS System with AI Voice Dictation and GSTR Automation",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`h-full ${plusJakartaSans.variable} ${jetbrainsMono.variable}`}>
      <body suppressHydrationWarning className={`h-full bg-slate-50 text-slate-900 antialiased font-sans selection:bg-indigo-500 selection:text-white ${plusJakartaSans.className}`}>
        {children}
      </body>
    </html>
  );
}
