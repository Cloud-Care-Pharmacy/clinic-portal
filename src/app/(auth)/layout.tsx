export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden"
      style={{
        background: "linear-gradient(180deg, var(--background) 0%, var(--card) 100%)",
      }}
    >
      <div className="relative z-10">{children}</div>
    </div>
  );
}
