import { currentUser } from "@clerk/nextjs/server";
import { api } from "@/lib/api";
import type { UserRole } from "@/types";
import { ProfileClient } from "./ProfileClient";

export default async function ProfilePage() {
  const user = await currentUser();
  const [initialProfile, initialPractitioner] = user
    ? await Promise.all([
        api.getMyProfile(user.id).catch(() => undefined),
        api.getMyPractitioner(user.id).catch(() => undefined),
      ])
    : [undefined, undefined];
  const role = (user?.publicMetadata?.role as UserRole | undefined) ?? "staff";
  const initialUser = user
    ? {
        firstName: user.firstName ?? "",
        lastName: user.lastName ?? "",
        fullName: [user.firstName, user.lastName].filter(Boolean).join(" ") || "User",
        email: user.emailAddresses[0]?.emailAddress ?? "",
        imageUrl: user.imageUrl,
        role,
      }
    : undefined;

  return (
    <ProfileClient
      initialProfile={initialProfile}
      initialPractitioner={initialPractitioner}
      initialUser={initialUser}
    />
  );
}
