import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard — Cloud Care Pharmacy",
};

export default function DashboardPageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
