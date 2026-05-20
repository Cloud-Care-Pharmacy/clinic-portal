export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="h-4 w-32 animate-pulse rounded bg-muted" />
      <div className="h-12 w-72 animate-pulse rounded bg-muted" />
      <div className="grid grid-cols-2 gap-4">
        <div className="h-40 animate-pulse rounded-sm bg-muted" />
        <div className="h-40 animate-pulse rounded-sm bg-muted" />
      </div>
      <div className="h-72 animate-pulse rounded-sm bg-muted" />
    </div>
  );
}
