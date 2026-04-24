import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Prescriptions — Cloud Care Pharmacy",
};

export default function PrescriptionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
