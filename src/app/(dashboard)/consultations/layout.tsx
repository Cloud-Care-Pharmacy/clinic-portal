import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Consultations — Cloud Care Pharmacy",
};

export default function ConsultationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
