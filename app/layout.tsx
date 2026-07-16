import "./globals.css";
import type { Metadata } from "next";
import { ReactNode } from "react";
import { AuthProvider } from "../context/AuthContext";
import { ZiiBot } from "../components/ZiiBot";
import { Inter } from "next/font/google";
import Script from "next/script";
import { InvoiceProvider } from "@/context/InvoiceContext"; // new
import { PaymentProvider } from "@/context/PaymentContext";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });
export const metadata: Metadata = {
  title: "Zyoris - Central Intelligence Layer",
  description: "Zyoris is an advanced Autonomous Business Intelligence Platform designed to streamline operations, enhance CRM, and provide real-time AI-driven insights for modern enterprises. Optimize your workflow, manage leads efficiently, and make data-backed decisions with our comprehensive suite of business tools.",
  keywords: ["Business Intelligence", "CRM", "Autonomous AI", "Analytics", "Enterprise Software", "Zyoris", "Dashboard", "Management", "SaaS", "B2B"],
  authors: [{ name: "Zyoris Team" }],
  openGraph: {
    title: "Zyoris - Central Intelligence Layer",
    description: "Advanced Autonomous Business Intelligence Platform for modern enterprises. Streamline operations and enhance CRM with AI.",
    type: "website",
    siteName: "Zyoris",
  },
  twitter: {
    card: "summary_large_image",
    title: "Zyoris - Central Intelligence Layer",
    description: "Advanced Autonomous Business Intelligence Platform.",
  },
  icons: {
    icon: "/icon.svg",
  },
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
          <InvoiceProvider>
            <PaymentProvider>
              {children}
            </PaymentProvider>
            <ZiiBot />
          </InvoiceProvider>
        </AuthProvider>
      </body>
    </html>
  );
}