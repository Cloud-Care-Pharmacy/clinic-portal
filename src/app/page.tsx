import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Cloud Care Pharmacy",
  description: "Patient management portal for Cloud Care Pharmacy.",
};

export default function Home() {
  redirect("/dashboard");
}
