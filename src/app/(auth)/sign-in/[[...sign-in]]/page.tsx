import { SignIn } from "@clerk/nextjs";

interface SignInPageProps {
  searchParams: Promise<{ reason?: string }>;
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const { reason } = await searchParams;
  const deactivated = reason === "deactivated";

  return (
    <div className="flex flex-col items-center gap-4">
      {deactivated && (
        <div
          role="alert"
          className="w-full max-w-md rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          Your account has been deactivated. Please contact your workspace
          administrator if you believe this is a mistake.
        </div>
      )}
      <SignIn
        appearance={{
          variables: {
            colorPrimary: "var(--primary)",
            colorText: "var(--foreground)",
            colorBackground: "var(--popover)",
            borderRadius: "0.5rem",
            fontFamily: "Outfit, sans-serif",
          },
          elements: {
            card: "shadow-[0_0_0_1px_rgba(15,23,42,0.04),0_16px_40px_rgba(15,23,42,0.10)] rounded-2xl bg-white",
            socialButtonsBlockButton:
              "border border-border bg-white hover:bg-muted text-foreground font-medium shadow-none h-11",
            socialButtonsBlockButtonText: "font-medium",
            footerAction: "bg-[var(--auth-card-bg)]",
            footerActionLink: "text-foreground font-semibold hover:text-primary",
          },
        }}
      />
    </div>
  );
}
