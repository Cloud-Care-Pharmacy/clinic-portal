import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <SignIn
      appearance={{
        variables: {
          colorPrimary: "#c96442",
          colorText: "#3d3929",
          borderRadius: "0.625rem",
        },
        elements: {
          card: "shadow-lg rounded-[20px] bg-card",
          formButtonPrimary:
            "bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-none",
          socialButtonsBlockButton:
            "border border-border bg-background hover:bg-accent text-foreground font-medium shadow-none",
          socialButtonsBlockButtonText: "font-medium",
          footerActionLink: "text-primary font-semibold hover:text-primary/80",
        },
      }}
    />
  );
}
