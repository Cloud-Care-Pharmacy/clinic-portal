import { api } from "@/lib/api";
import { PatientsClient } from "./PatientsClient";

const ENTITY_ID = process.env.NEXT_PUBLIC_DEFAULT_ENTITY_ID ?? "";

export default async function PatientsPage() {
  const initialPatients = ENTITY_ID
    ? await api.getPatients(ENTITY_ID, { limit: 50, offset: 0 }).catch(() => undefined)
    : undefined;

  return <PatientsClient entityId={ENTITY_ID} initialPatients={initialPatients} />;
}
