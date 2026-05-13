import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Edit template — Cloud Care Pharmacy",
};

export default function TemplateEditLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
