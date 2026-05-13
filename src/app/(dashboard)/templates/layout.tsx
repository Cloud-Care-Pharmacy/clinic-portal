import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Templates — Cloud Care Pharmacy",
};

export default function TemplatesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
