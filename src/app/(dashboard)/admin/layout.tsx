import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Administration — Cloud Care Pharmacy",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
