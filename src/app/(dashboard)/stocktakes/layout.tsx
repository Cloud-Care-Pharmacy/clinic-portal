import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Stocktakes — Cloud Care Pharmacy",
};

export default function StocktakesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
