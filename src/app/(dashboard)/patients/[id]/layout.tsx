import PatientLayoutClient from "./PatientLayoutClient";

export default async function PatientDetailLayout({
  params,
  children,
}: {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
}) {
  const { id } = await params;

  return <PatientLayoutClient id={id}>{children}</PatientLayoutClient>;
}
