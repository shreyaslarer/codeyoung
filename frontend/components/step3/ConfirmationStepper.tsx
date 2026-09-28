"use client";

import React from "react";
import { Check } from "lucide-react";

interface ConfirmationStepperProps {
  onGoToStep1: () => void;
  onGoToStep2: () => void;
}

export function ConfirmationStepper({ onGoToStep1, onGoToStep2 }: ConfirmationStepperProps) {
  return (
    <nav aria-label="Progress" className="flex items-center justify-center gap-2 mb-4 sm:mb-5 select-none">
      {/* Step 1: 1 Time (Completed) */}
      <button
        type="button"
        onClick={onGoToStep1}
        className="flex items-center gap-1.5 text-slate-600 hover:text-slate-950 transition-colors cursor-pointer focus:outline-none"
      >
        <span className="w-5 h-5 rounded-full bg-[#CBD5E1]/70 flex items-center justify-center text-slate-800">
          <Check className="w-3 h-3 stroke-[2.5]" />
        </span>
        <span className="text-sm font-semibold">1 Time</span>
      </button>

      {/* Divider */}
      <div className="w-8 h-px bg-[#CBD5E1]" />

      {/* Step 2: 2 Details (Completed) */}
      <button
        type="button"
        onClick={onGoToStep2}
        className="flex items-center gap-1.5 text-slate-600 hover:text-slate-950 transition-colors cursor-pointer focus:outline-none"
      >
        <span className="w-5 h-5 rounded-full bg-[#CBD5E1]/70 flex items-center justify-center text-slate-800">
          <Check className="w-3 h-3 stroke-[2.5]" />
        </span>
        <span className="text-sm font-semibold">2 Details</span>
      </button>

      {/* Divider */}
      <div className="w-8 h-px bg-[#CBD5E1]" />

      {/* Step 3: 3 Confirm (Active) */}
      <div className="flex items-center gap-1.5 text-[#0F172A]">
        <span className="w-5 h-5 rounded-full bg-[#F5A623] flex items-center justify-center text-slate-950 font-bold shadow-2xs">
          <Check className="w-3 h-3 stroke-[3]" />
        </span>
        <span className="text-sm font-bold text-[#0F172A]">3 Confirm</span>
      </div>
    </nav>
  );
}
