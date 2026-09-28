"use client";

import React from "react";
import { Video } from "lucide-react";

interface SelectedAppointmentCardProps {
  dateFormatted: string;
  time: string;
  timezoneLabel: string;
  duration?: string;
  isConfirmed?: boolean;
}

export function SelectedAppointmentCard({
  dateFormatted,
  time,
  timezoneLabel,
  duration = "30 minutes",
  isConfirmed = true,
}: SelectedAppointmentCardProps) {
  return (
    <div className="w-full bg-white border border-[#CBD5E1] rounded-2xl p-5 shadow-card card-lift">
      {/* Top Row: Title + Status Badge */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-slate-900">
          Selected appointment
        </span>
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-all duration-300 ${
            time
              ? "bg-emerald-50 text-emerald-800 border border-emerald-300/80"
              : "bg-amber-50 text-amber-800 border border-amber-300/80"
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
              time ? "bg-emerald-500" : "bg-amber-500"
            }`}
          />
          {time ? (isConfirmed ? "Confirmed Slot" : "Selected Slot") : "Pending Selection"}
        </span>
      </div>

      {/* Main Appointment Time */}
      <div className="mt-3">
        <h4 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight transition-all duration-300">
          {time ? `${dateFormatted} at ${time}` : `${dateFormatted} · Select a time`}
        </h4>
        <p className="text-xs text-slate-500 mt-0.5">
          {timezoneLabel} · {duration}
        </p>
      </div>

      {/* Bottom Row Info */}
      <div className="mt-3.5 pt-3.5 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-500">
        <Video className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span>1-on-1 trial class · Mentor assigned automatically</span>
      </div>
    </div>
  );
}
