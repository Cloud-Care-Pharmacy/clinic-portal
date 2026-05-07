import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rosters — Cloud Care Pharmacy",
};

export default function RostersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
