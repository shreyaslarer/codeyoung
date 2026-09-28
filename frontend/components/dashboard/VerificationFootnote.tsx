"use client";

import React from "react";
import { ShieldCheck, Cpu } from "lucide-react";
import { DashboardVerificationSummary } from "@/types/dashboard.types";

interface VerificationFootnoteProps {
  summary: DashboardVerificationSummary;
}

export function VerificationFootnote({ summary }: VerificationFootnoteProps) {
  return (
    <div className="rounded-2xl px-5 py-4 bg-white/95 border border-[#CBD5E1] shadow-card card-lift anim-fade-up delay-300">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-600">
        <div className="flex items-center gap-2 text-[#0F172A] font-bold">
          <ShieldCheck className="w-4 h-4 text-[#D98B0F]" />
          <span className="font-mono text-[11px] uppercase tracking-wider">SYSTEM INVARIANTS:</span>
        </div>
        <span className="font-medium">
          <strong className="text-slate-900">{summary.seededMentorsCount}</strong> mentors registered
        </span>
        <span className="text-slate-300">·</span>
        <span className="font-medium">
          Daily limit: <strong className="text-slate-900">{summary.dailyCapPerMentor} classes</strong> / mentor
        </span>
        <span className="text-slate-300">·</span>
        <span className="font-mono text-[11px] text-slate-700 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
          {summary.allocationStrategy}
        </span>
        <span className="text-slate-300">·</span>
        <span className="text-[#00A86B] font-mono text-[11px] font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
          {summary.dbConstraint}
        </span>
      </div>
    </div>
  );
}
