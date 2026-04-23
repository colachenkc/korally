export function PagePlaceholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-cream-200 bg-white p-12 text-center shadow-card">
      <h1 className="text-2xl font-semibold text-ink">{title}</h1>
      <p className="mt-2 text-sm text-ink-muted">{description}</p>
      <p className="mt-4 font-mono text-xs uppercase tracking-widest text-ink-faint">
        route placeholder
      </p>
    </div>
  );
}
