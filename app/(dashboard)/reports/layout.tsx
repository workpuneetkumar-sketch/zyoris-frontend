import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reports",
  description: "Generate and export business reports",
};

export default function ReportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}