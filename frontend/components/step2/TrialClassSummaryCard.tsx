"use client";

import React from "react";
import Image from "next/image";
import { Clock, Globe, ShieldCheck, Check } from "lucide-react";

interface TrialClassSummaryCardProps {
  dateFormatted: string;
  time: string;
  timezoneLabel: string;
  duration?: string;
}

export function TrialClassSummaryCard({
  dateFormatted,
  time,
  timezoneLabel,
  duration = "30 minutes",
}: TrialClassSummaryCardProps) {
  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-slate-900">
          Your trial class
        </h2>
        <Image
          src="/primary_logo.png"
          alt="Codeyoung"
          width={112}
          height={35}
          className="h-7 w-auto object-contain"
        />
      </div>

      <div className="w-full bg-white rounded-2xl border border-[#CBD5E1] p-6 shadow-card card-lift flex flex-col">
        {/* Prominent Appointment Info */}
        <div className="flex flex-col gap-1 mb-4">
          <span className="text-lg font-bold text-slate-900">
            {dateFormatted}
          </span>
          <span className="text-[26px] leading-[32px] font-extrabold text-[#0F172A] tabular-nums tracking-tight">
            {time}
          </span>
          <span className="text-sm font-semibold text-slate-600 mt-0.5">
            {timezoneLabel}
          </span>
        </div>

        {/* Duration Badge */}
        <div className="flex items-center gap-2 text-slate-800 mb-6">
          <Clock className="w-4 h-4 text-slate-500 shrink-0" />
          <span className="text-sm font-medium">{duration} · 1-on-1 trial class</span>
        </div>

        {/* Subtle Divider */}
        <div className="w-full h-[1px] bg-slate-100 mb-5" />

        {/* Clarification & Status Notes */}
        <div className="flex flex-col gap-2.5 mb-6">
          <div className="flex items-start gap-2">
            <Globe className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
            <p className="text-xs text-slate-600 leading-snug">
              Times shown in your local timezone automatically.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
            <p className="text-xs text-slate-600 leading-snug">
              Mentor will be matched automatically upon confirmation.
            </p>
          </div>
        </div>

        {/* Reassurance Checklist */}
        <div className="bg-[#F8FAFC] rounded-xl p-3.5 flex flex-col gap-2 border border-[#CBD5E1]">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 font-bold shrink-0 stroke-[2.5]" />
            <span className="text-xs font-semibold text-slate-700">
              Free cancellation anytime
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 font-bold shrink-0 stroke-[2.5]" />
            <span className="text-xs font-semibold text-slate-700">
              No credit card required
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
