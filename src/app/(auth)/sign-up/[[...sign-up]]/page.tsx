import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <SignUp
      appearance={{
        variables: {
          colorPrimary: "#0f172a",
          colorText: "#0f172a",
          borderRadius: "0.5rem",
        },
        elements: {
          card: "shadow-xl rounded-2xl",
          formButtonPrimary:
            "bg-[#0f172a] hover:bg-[#1e293b] text-white font-medium shadow-none",
          socialButtonsBlockButton:
            "border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-medium shadow-none",
          socialButtonsBlockButtonText: "font-medium",
          footerActionLink: "text-[#0f172a] font-semibold hover:text-[#1e293b]",
        },
      }}
    />
  );
}
