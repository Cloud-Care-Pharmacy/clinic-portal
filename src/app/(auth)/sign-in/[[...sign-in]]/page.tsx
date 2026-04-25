import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
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
  );
}
