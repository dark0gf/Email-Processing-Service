import { formatNumber } from "./utils";
import { mutedTextClass, panelClass } from "./constants";

export function SummaryCard({ label, tone = "default", value }: { label: string; tone?: "default" | "warning"; value: number }) {
  return (
    <article className={panelClass}>
      <p className={`mb-1.5 text-sm ${mutedTextClass}`}>{label}</p>
      <strong className={tone === "warning" ? "text-4xl text-amber-700" : "text-4xl text-slate-900"}>{formatNumber(value)}</strong>
    </article>
  );
}
