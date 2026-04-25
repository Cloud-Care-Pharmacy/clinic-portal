"use client";

import { use } from "react";
import { ActivityTab } from "../components/tabs/ActivityTab";

export default function ActivityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return <ActivityTab patientId={id} />;
}
