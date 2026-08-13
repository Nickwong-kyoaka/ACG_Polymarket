"use client";

import type { ReactNode } from "react";
import { CheckCircle2, LoaderCircle, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export const adminInputClass =
  "w-full rounded-2xl border border-[#171126]/12 bg-white/85 px-4 py-3 text-sm font-semibold text-[#171126] outline-none transition placeholder:text-slate-400 focus:border-[#ff3d7f] focus:ring-4 focus:ring-[#ff3d7f]/10";

export type AdminNotice = {
  tone: "success" | "error";
  message: string;
} | null;

export function AdminField({
  label,
  hint,
  required,
  className,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={cn("grid gap-2", className)}>
      <span className="flex items-center justify-between gap-3 text-xs font-black uppercase tracking-[0.14em] text-slate-600">
        <span>
          {label}
          {required ? <span className="ml-1 text-[#ff3d7f]">*</span> : null}
        </span>
        {hint ? <span className="normal-case tracking-normal text-slate-400">{hint}</span> : null}
      </span>
      {children}
    </label>
  );
}

export function AdminNoticeBar({ notice }: { notice: AdminNotice }) {
  if (!notice) return null;

  const isSuccess = notice.tone === "success";
  const Icon = isSuccess ? CheckCircle2 : TriangleAlert;

  return (
    <div
      role="status"
      className={cn(
        "flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm font-bold",
        isSuccess
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-rose-200 bg-rose-50 text-rose-800",
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{notice.message}</span>
    </div>
  );
}

export function AdminSubmitButton({
  pending,
  children,
  disabled,
}: {
  pending: boolean;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#171126] px-5 py-3 text-sm font-black text-white shadow-[0_18px_36px_-24px_rgba(23,17,38,0.9)] transition hover:-translate-y-0.5 hover:bg-[#ff3d7f] disabled:cursor-not-allowed disabled:opacity-45"
    >
      {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
      {children}
    </button>
  );
}

export async function postAdmin<T>(endpoint: string, payload: Record<string, unknown>) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = (await response.json()) as T & { error?: string };

  if (!response.ok) {
    throw new Error(data.error ?? `Request failed with status ${response.status}.`);
  }

  return data;
}

export function AdminSectionCard({
  title,
  description,
  accent = "pink",
  children,
}: {
  title: string;
  description: string;
  accent?: "pink" | "cyan" | "gold";
  children: ReactNode;
}) {
  const accentClass = {
    pink: "from-[#ff3d7f] to-[#ff8a3d]",
    cyan: "from-[#38c7ff] to-[#7c5cff]",
    gold: "from-[#ffe56b] to-[#ff8a3d]",
  }[accent];

  return (
    <section className="manga-panel overflow-hidden rounded-[2rem] bg-white/90 shadow-[0_24px_80px_-48px_rgba(23,17,38,0.62)]">
      <div className={cn("h-2 bg-gradient-to-r", accentClass)} />
      <div className="grid gap-6 p-5 sm:p-7">
        <div>
          <h2 className="font-display text-2xl text-[#171126] sm:text-3xl">{title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{description}</p>
        </div>
        {children}
      </div>
    </section>
  );
}
