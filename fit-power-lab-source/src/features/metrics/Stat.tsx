import type { ReactNode } from "react";

interface StatProps {
  label: string;
  value: string;
  /** A short note under the value, such as what it is measured over. */
  hint?: string;
}

/** One figure with its name; it belongs inside a `StatGrid`. */
export function Stat({ label, value, hint }: StatProps) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-muted-foreground text-sm">{label}</dt>
      <dd className="text-lg font-semibold">
        {value}
        {hint ? (
          <span className="text-muted-foreground block text-xs font-normal">{hint}</span>
        ) : null}
      </dd>
    </div>
  );
}

export function StatGrid({ children }: { children: ReactNode }) {
  return <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">{children}</dl>;
}
