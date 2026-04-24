export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0f172a]">
      {/* Decorative gradient curves */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-[40%] -right-[20%] h-[120%] w-[70%] rounded-full bg-[#1e293b]/60 blur-3xl" />
        <div className="absolute -bottom-[40%] -left-[20%] h-[120%] w-[70%] rounded-full bg-[#1e293b]/40 blur-3xl" />
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  );
}
