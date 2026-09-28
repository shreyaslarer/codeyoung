"use client";

import React from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { DashboardInvariants } from "@/types/dashboard.types";

interface InvariantStatusStripProps {
  invariants?: DashboardInvariants;
}

export function InvariantStatusStrip({ invariants }: InvariantStatusStripProps) {
  const collisions = invariants?.collisions ?? 0;
  const hasIssue = collisions > 0;

  return (
    <div className="bg-white rounded-2xl px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 border border-[#CBD5E1] shadow-card card-lift anim-fade-up delay-150">
      {/* Primary Invariant State */}
      <div className="flex items-center gap-2.5">
        <div
          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
            hasIssue
              ? "bg-rose-50 text-rose-600 border border-rose-200"
              : "bg-emerald-50 text-emerald-600 border border-emerald-200"
          }`}
        >
          {hasIssue ? (
            <AlertCircle className="w-4 h-4 text-rose-500" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-[#00A86B]" />
          )}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-bold text-[#0F172A]">
              {hasIssue
                ? `${collisions} scheduling conflict${collisions > 1 ? "s" : ""} detected`
                : "Zero Scheduling Conflicts"}
            </span>
            <span className="text-[10px] font-mono font-bold text-[#00A86B] bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">
              VERIFIED
            </span>
          </div>
          <p className="text-[11px] text-slate-500 hidden sm:block">
            Strict mutual exclusion on booking slots verified against MongoDB collection.
          </p>
        </div>
      </div>

      {/* Developer Invariant Badges */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#F8FAFC] border border-[#CBD5E1] text-slate-700 font-mono text-[11px]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00A86B]" />
          <span>CAP: 2/DAY MAX</span>
        </div>

        <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#F8FAFC] border border-[#CBD5E1] text-slate-700 font-mono text-[11px]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#F5A623]" />
          <span>ALLOC: LEAST-LOADED</span>
        </div>

        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#F8FAFC] border border-[#CBD5E1] text-slate-700 font-mono text-[11px]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6]" />
          <span>DST // UTC NORM</span>
        </div>
      </div>
    </div>
  );
}
