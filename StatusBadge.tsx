import { clsx } from "clsx";

const STYLES: Record<string, string> = {
  present: "bg-ok/10 text-ok",
  approved: "bg-ok/10 text-ok",
  absent: "bg-bad/10 text-bad",
  rejected: "bg-bad/10 text-bad",
  half_day: "bg-warn/10 text-warn",
  pending: "bg-warn/10 text-warn",
  leave: "bg-flow-light text-flow-dark",
};

export function StatusBadge({ status }: { status: string }) {
  const label = status.replace("_", " ");
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize",
        STYLES[status] ?? "bg-mist text-slate"
      )}
    >
      {label}
    </span>
  );
}
