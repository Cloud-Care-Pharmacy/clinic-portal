export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="h-4 w-32 animate-pulse rounded bg-muted" />
      <div className="h-12 w-64 animate-pulse rounded bg-muted" />
      <div className="h-96 w-full animate-pulse rounded-sm bg-muted" />
    </div>
  );
}
