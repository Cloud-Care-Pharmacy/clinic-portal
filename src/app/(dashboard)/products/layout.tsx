import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Products — Cloud Care Pharmacy",
};

export default function ProductsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
