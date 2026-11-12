import type { ReactNode } from "react";
import { lessonStatusMeta, type StatusTone } from "@/lib/lessons/status";

const tones: Record<StatusTone, string> = {
  neutral: "bg-slate-100 text-slate-700 ring-slate-200",
  info: "bg-royal-50 text-royal-700 ring-royal-100",
  progress: "bg-sky-50 text-sky-800 ring-sky-100",
  success: "bg-emerald-50 text-emerald-800 ring-emerald-100",
  warning: "bg-amber-50 text-amber-900 ring-amber-200",
  danger: "bg-red-50 text-red-800 ring-red-100",
};

export function Badge({ tone = "neutral", children }: { tone?: StatusTone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function LessonStatusBadge({ status }: { status: string }) {
  const meta = lessonStatusMeta(status);
  return (
    <span title={meta.description}>
      <Badge tone={meta.tone}>{meta.label}</Badge>
    </span>
  );
}
