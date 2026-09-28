"use client";

import React from "react";
import { Check } from "lucide-react";

interface Step2ProgressProps {
  onBackToTime: () => void;
}

export function Step2Progress({ onBackToTime }: Step2ProgressProps) {
  return (
    <nav aria-label="Progress" className="flex items-center gap-2 mb-8 select-none">
      {/* Step 1: 1 Time (Completed, clickable to return) */}
      <button
        type="button"
        onClick={onBackToTime}
        className="flex items-center gap-1.5 group text-[#0F172A] transition-opacity hover:opacity-80 cursor-pointer focus:outline-none"
      >
        <span className="w-5 h-5 rounded-full bg-[#0F172A] text-white flex items-center justify-center text-[11px] font-semibold">
          <Check className="w-3 h-3 stroke-[2.5]" />
        </span>
        <span className="text-sm font-semibold text-[#0F172A]">1 Time</span>
      </button>

      {/* Divider */}
      <span className="w-8 h-[1px] bg-[#CBD5E1] mx-1" />

      {/* Step 2: 2 Details (Active) */}
      <div aria-current="step" className="flex items-center gap-1.5">
        <span className="w-5 h-5 rounded-full bg-[#F5A623] text-slate-950 flex items-center justify-center text-[11px] font-bold shadow-2xs">
          2
        </span>
        <span className="text-sm font-semibold text-[#0F172A]">Details</span>
      </div>

      {/* Divider */}
      <span className="w-8 h-[1px] bg-[#CBD5E1] mx-1" />

      {/* Step 3: 3 Confirm (Upcoming) */}
      <div className="flex items-center gap-1.5 text-slate-400">
        <span className="w-5 h-5 rounded-full bg-[#CBD5E1]/50 text-slate-500 flex items-center justify-center text-[11px] font-medium border border-[#CBD5E1]">
          3
        </span>
        <span className="text-sm font-normal text-slate-500">Confirm</span>
      </div>
    </nav>
  );
}
