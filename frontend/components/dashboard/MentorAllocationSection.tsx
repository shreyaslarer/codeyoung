"use client";

import React from "react";
import { Check, UserCheck } from "lucide-react";
import { MentorAllocationItem, AvailableMentorQueueItem } from "@/types/dashboard.types";

interface MentorAllocationSectionProps {
  allocations: readonly MentorAllocationItem[];
  availableQueue: readonly AvailableMentorQueueItem[];
  unassignedCount?: number;
  onSelectMentor?: (mentorCode: string) => void;
}

export function MentorAllocationSection({
  allocations,
  availableQueue,
  unassignedCount,
  onSelectMentor,
}: MentorAllocationSectionProps) {
  const zeroClassesCount =
    unassignedCount !== undefined
      ? unassignedCount
      : allocations.filter((a) => a.assignedCount === 0).length;

  // Sort logically: Mentors with 1 class first, then mentors with 2 classes (Full), then unassigned
  const sortedAllocations = [...allocations].sort((a, b) => {
    const rank = (count: number) => (count === 1 ? 1 : count >= 2 ? 2 : 3);
    if (rank(a.assignedCount) !== rank(b.assignedCount)) {
      return rank(a.assignedCount) - rank(b.assignedCount);
    }
    return a.mentorCode.localeCompare(b.mentorCode);
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 anim-fade-up delay-200">
      {/* Column 1 (2/3 width): Assignment Balance Indicator */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-card border border-[#CBD5E1] lg:col-span-2 flex flex-col justify-between card-lift">
        <div>
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-4">
            <div>
              <h4 className="text-base font-bold text-[#0F172A] tracking-tight">
                Mentor Allocation Distribution
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Classes assigned per mentor today against their daily cap. Click any mentor to view their schedule &amp; meeting URL.
              </p>
            </div>
            <span className="text-xs font-mono font-semibold text-[#D98B0F] bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200/80 shrink-0">
              Max 2 classes / mentor
            </span>
          </div>

          {/* Allocation Grid */}
          <div>
            {sortedAllocations.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">
                No mentor allocations recorded for this date.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {sortedAllocations.map((item) => (
                  <div
                    key={item.mentorCode}
                    onClick={() => onSelectMentor?.(item.mentorCode)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelectMentor?.(item.mentorCode);
                      }
                    }}
                    title="Click to view schedule & shared meeting URL"
                    className="bg-[#F8FAFC] hover:bg-white border border-[#CBD5E1] hover:border-amber-400 rounded-xl p-3 transition-all shadow-control hover:shadow-xs flex items-center justify-between gap-2.5 cursor-pointer group"
                  >
                    {/* Mentor Code & Name */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 font-mono ${
                          item.isFull
                            ? "bg-amber-100 text-[#784E00] border border-amber-200"
                            : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                        }`}
                      >
                        {item.mentorCode.replace(/Mentor\s*/i, "")}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[#0F172A] truncate group-hover:text-[#D98B0F] transition-colors">
                          {item.mentorCode}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {item.mentorName}
                        </div>
                      </div>
                    </div>

                    {/* Dual-Segment Yellow Line Progress Indicator */}
                    <div
                      className="flex-1 max-w-[84px] flex items-center gap-1 px-1"
                      title={`${item.assignedCount} of ${item.maxCapacity} classes assigned`}
                    >
                      {/* Slot 1 Bar */}
                      <div
                        className={`h-2 flex-1 rounded-xs transition-all duration-300 ${
                          item.assignedCount >= 1
                            ? item.isFull
                              ? "bg-[#D97706]"
                              : "bg-[#F5A623]"
                            : "bg-[#CBD5E1]"
                        }`}
                      />
                      {/* Slot 2 Bar */}
                      <div
                        className={`h-2 flex-1 rounded-xs transition-all duration-300 ${
                          item.assignedCount >= 2
                            ? "bg-[#D97706]"
                            : "bg-[#CBD5E1]"
                        }`}
                      />
                    </div>

                    {/* Count & Status Badge */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="font-mono text-xs font-bold text-[#0F172A] tabular-nums">
                        {item.assignedCount}/{item.maxCapacity}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          item.isFull
                            ? "bg-amber-100 text-amber-900 border border-amber-300/80"
                            : "bg-emerald-50 text-emerald-800 border border-emerald-300/80"
                        }`}
                      >
                        {item.isFull ? "Capped" : "Active"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-5 pt-3.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
          <span className="font-medium">
            <strong className="text-slate-900">{zeroClassesCount}</strong> mentor
            {zeroClassesCount !== 1 ? "s" : ""} on standby with 0 classes today
          </span>
          <span className="text-[#00A86B] font-semibold flex items-center gap-1 text-[11px] bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Capacity limits enforced</span>
          </span>
        </div>
      </div>

      {/* Column 2 (1/3 width): Next Available Mentors Queue */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-card border border-[#CBD5E1] flex flex-col justify-between card-lift">
        <div>
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <div>
              <h4 className="text-base font-bold text-[#0F172A] tracking-tight">
                Standby Mentors
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Available mentors queued for new trial bookings.
              </p>
            </div>
            <div className="p-1.5 rounded-lg bg-emerald-50 border border-emerald-200/80">
              <UserCheck className="w-4 h-4 text-[#00A86B]" />
            </div>
          </div>

          <div className="space-y-2">
            {availableQueue.map((queueItem) => (
              <div
                key={queueItem.mentorCode}
                onClick={() => onSelectMentor?.(queueItem.mentorCode)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectMentor?.(queueItem.mentorCode);
                  }
                }}
                title="Click to view mentor status & details"
                className="p-3 rounded-xl bg-[#F8FAFC] hover:bg-white border border-[#CBD5E1] hover:border-amber-400 flex items-center justify-between transition-all shadow-control cursor-pointer group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-2 h-2 rounded-full bg-[#00A86B] animate-pulse shrink-0" />
                  <div className="min-w-0 truncate">
                    <span className="text-xs font-bold text-[#0F172A] font-mono group-hover:text-[#D98B0F] transition-colors">
                      {queueItem.mentorCode}
                    </span>
                    <span className="text-[11px] text-slate-500 ml-1.5 truncate">
                      {queueItem.mentorName}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Empty dual-slot preview */}
                  <div className="flex gap-1" title="0 of 2 slots used">
                    <div className="w-3.5 h-2 rounded-xs bg-[#CBD5E1]" />
                    <div className="w-3.5 h-2 rounded-xs bg-[#CBD5E1]" />
                  </div>
                  <span className="text-[10px] font-semibold text-[#00A86B] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    Available
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 pt-3.5 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100">
          <span>Allocation priority</span>
          <span className="text-[#00A86B] font-semibold">Available for booking</span>
        </div>
      </div>
    </div>
  );
}
