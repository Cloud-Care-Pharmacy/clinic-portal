"use client";

import { use } from "react";
import { OverviewTab } from "./components/tabs/OverviewTab";
import { useRouter } from "next/navigation";

export default function PatientOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  return (
    <OverviewTab
      patientId={id}
      onTabChange={(tab) => router.push(`/patients/${id}/${tab}`, { scroll: false })}
    />
  );
}
