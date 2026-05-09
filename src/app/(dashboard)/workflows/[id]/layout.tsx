import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Workflow — Cloud Care Pharmacy",
};

export default function WorkflowDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
