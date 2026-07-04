import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Payments & Invoice Management",
  description: "Manage invoices and record payments",
};

export default function PaymentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}