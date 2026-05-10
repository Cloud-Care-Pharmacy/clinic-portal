import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Workflow runs — Cloud Care Pharmacy",
};

export default function WorkflowRunsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
