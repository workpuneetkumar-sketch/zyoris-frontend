import "./globals.css";
import type { Metadata } from "next";
import { ReactNode } from "react";
import { AuthProvider } from "../context/AuthContext";
import { ZiiBot } from "../components/ZiiBot";
import { Inter } from "next/font/google";
import Script from "next/script";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });
export const metadata: Metadata = {
  title: "Zyoris - Central Intelligence Layer",
  description: "Autonomous Business Intelligence Platform",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="light">
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
        />
      </head>
      <body className={inter.className}>
        <Script
          src="https://cdn.jsdelivr.net/npm/chart.js"
          strategy="beforeInteractive"
        />
        <AuthProvider>
          {children}
          <ZiiBot />
        </AuthProvider>
      </body>
    </html>
  );
}

