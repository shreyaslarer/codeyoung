"use client";

import React from "react";
import Image from "next/image";
import { Globe, ShieldCheck } from "lucide-react";

interface ConfirmedAppointmentCardProps {
  dateFormatted: string;
  time: string;
  timezoneLabel: string;
  duration?: string;
  mentorId?: string;
}

export function ConfirmedAppointmentCard({
  dateFormatted,
  time,
  timezoneLabel,
  duration = "30 minutes",
  mentorId,
}: ConfirmedAppointmentCardProps) {
  return (
    <section className="bg-white rounded-2xl shadow-card border border-[#CBD5E1] p-5 sm:p-6 mb-3 sm:mb-4 card-lift">
      {/* Card Eyebrow */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Image
            src="/primary_logo.png"
            alt="Codeyoung"
            width={112}
            height={35}
            className="h-6 sm:h-7 w-auto object-contain"
          />
          <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
            · Trial class
          </span>
        </div>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/80 text-xs font-semibold">
          1-on-1 Interactive
        </span>
      </div>

      {/* Main Schedule Content */}
      <div className="space-y-1 mb-3">
        <p className="text-base sm:text-lg font-bold text-slate-900">{dateFormatted}</p>
        <p className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tabular-nums tracking-tight">{time}</p>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm text-slate-600 pt-0.5">
          <span className="font-semibold text-slate-800">{timezoneLabel}</span>
          <span className="text-slate-400">·</span>
          <span>{duration} · 1-on-1 trial class</span>
        </div>
      </div>

      {/* Local Timezone Notice */}
      <div className="flex items-center gap-2 text-slate-600 text-xs bg-[#F8FAFC] py-1.5 px-3 rounded-xl mb-3 border border-[#CBD5E1]">
        <Globe className="w-3.5 h-3.5 text-slate-500 shrink-0" />
        <span>Time shown in your local timezone automatically.</span>
      </div>

      {/* Subtle Divider */}
      <div className="w-full h-px bg-slate-100 my-3" />

      {/* Mentor Reassurance */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
        <span>
          {mentorId 
            ? `Mentor assigned (ID: ${mentorId}) — Ready for your trial class.`
            : "Your mentor is assigned automatically based on learner profile."}
        </span>
      </div>
    </section>
  );
}
