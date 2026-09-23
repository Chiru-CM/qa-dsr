import { ArrowUpRight, CircleAlert, CircleCheck, CircleDot, CircleX, Clock3 } from "lucide-react";
import { statusTone } from "@/lib/dsr-data";

export function StatusBadge({ status, compact = false }: { status: string; compact?: boolean }) {
  const tone = statusTone(status);
  const styles = {
    success: "bg-[#e7f7f1] text-[#20866f] ring-[#bce8d8]",
    info: "bg-[#eaf2ff] text-[#4071ba] ring-[#c9dcfb]",
    danger: "bg-[#fff0ed] text-[#c65e52] ring-[#f7c9c2]",
    warning: "bg-[#fff7e5] text-[#ae7d22] ring-[#f2dfaa]",
    neutral: "bg-slate-100 text-slate-500 ring-slate-200",
  }[tone];
  const Icon = tone === "success" ? CircleCheck : tone === "danger" ? CircleX : tone === "warning" ? CircleAlert : tone === "info" ? Clock3 : CircleDot;
  return <span className={`inline-flex items-center gap-1.5 rounded-full font-semibold ring-1 ${compact ? "px-2 py-1 text-[10px]" : "px-2.5 py-1 text-[11px]"} ${styles}`}><Icon size={compact ? 11 : 12} strokeWidth={2.4} />{status}</span>;
}

export function ProgressBar({ value, className = "", showValue = true }: { value: number | null; className?: string; showValue?: boolean }) {
  const percentage = value === null ? 0 : Math.round(value * 100);
  return <div className={`flex items-center gap-2 ${className}`}><div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#37b9a5] transition-all" style={{ width: `${percentage}%` }} /></div>{showValue && <span className="w-9 text-right text-[11px] font-semibold text-slate-500">{value === null ? "—" : `${percentage}%`}</span>}</div>;
}

export function PageTitle({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: React.ReactNode }) {
  return <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="mb-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#31a896]">{eyebrow ?? "DSR workspace"}</p><h1 className="text-[26px] font-bold tracking-[-0.025em] text-slate-900 md:text-[30px]">{title}</h1>{description && <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500">{description}</p>}</div>{action}</div>;
}

export function SectionHeading({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return <div className="mb-4 flex items-center justify-between gap-4"><div><h2 className="text-[15px] font-bold text-slate-800">{title}</h2>{description && <p className="mt-0.5 text-xs text-slate-400">{description}</p>}</div>{action}</div>;
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-6 py-10 text-center"><ArrowUpRight className="mx-auto mb-3 text-slate-300" size={22} /><p className="text-sm font-semibold text-slate-600">{title}</p><p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-slate-400">{description}</p></div>;
}
