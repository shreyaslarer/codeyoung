"use client";

import React from "react";
import { Check } from "lucide-react";

export function ConfirmationHeader() {
  return (
    <header className="text-center mb-4 sm:mb-5 anim-fade-up">
      {/* Success bloom ring + check icon — Apple-style calm feedback */}
      <div className="relative inline-flex items-center justify-center mb-3 sm:mb-4">
        {/* Single dignified bloom ring — plays once and fades */}
        <span
          className="absolute rounded-full border border-emerald-400/50 success-bloom-ring pointer-events-none"
          style={{
            width: "68px",
            height: "68px",
          }}
        />
        {/* Main check container */}
        <div
          className="relative w-12 h-12 sm:w-13 sm:h-13 rounded-full bg-emerald-50 border border-emerald-200/90 flex items-center justify-center anim-check-appear shadow-xs"
          style={{ boxShadow: "0 0 0 5px rgba(16,185,129,0.08)" }}
        >
          <Check className="w-6 h-6 sm:w-6.5 sm:h-6.5 text-emerald-600 stroke-[2.75]" />
        </div>
      </div>

      {/* Main Title & Subtitle */}
      <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight">
        Trial class confirmed
      </h1>
      <p className="text-sm sm:text-[15px] text-slate-600 mt-0.5 sm:mt-1">
        Your trial class is scheduled.
      </p>
    </header>
  );
}
