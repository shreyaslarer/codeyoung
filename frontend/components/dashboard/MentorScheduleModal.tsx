"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import {
  X,
  ExternalLink,
  Copy,
  Check,
  Clock,
  User,
  Mail,
  Globe,
  Video,
  ShieldCheck,
} from "lucide-react";
import {
  MentorFleetItem,
  MentorAllocationItem,
  AvailableMentorQueueItem,
  BookingActivityItem,
} from "@/types/dashboard.types";

interface MentorScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  mentor: MentorFleetItem | MentorAllocationItem | AvailableMentorQueueItem | null;
  scheduledBookings: readonly BookingActivityItem[];
  selectedDate: string;
}

export function MentorScheduleModal({
  isOpen,
  onClose,
  mentor,
  scheduledBookings,
  selectedDate,
}: MentorScheduleModalProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen || !mentor) return null;

  const handleCopyLink = async (bookingId: string, url: string) => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = url;
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopiedId(bookingId);
      setTimeout(() => setCopiedId(null), 2500);
    } catch {
      setCopiedId(null);
    }
  };

  const formatDisplayDate = (d: string) => {
    if (!d) return "Tuesday, September 29, 2026";
    const [y, m, day] = d.split("-").map(Number);
    if (!y || !m || !day) return d;
    const dateObj = new Date(Date.UTC(y, m - 1, day, 12, 0, 0));
    return dateObj.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });
  };

  const getTrackBadgeStyle = (track?: string) => {
    const t = (track || "CODING").toUpperCase();
    if (t.includes("CODING")) {
      return { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" };
    }
    if (t.includes("MATH")) {
      return { bg: "bg-amber-50", text: "text-[#D98B0F]", border: "border-amber-200" };
    }
    if (t.includes("SCIENCE")) {
      return { bg: "bg-emerald-50", text: "text-[#00A86B]", border: "border-emerald-200" };
    }
    if (t.includes("ENGLISH")) {
      return { bg: "bg-cyan-50", text: "text-cyan-800", border: "border-cyan-200" };
    }
    if (t.includes("ROBOTICS")) {
      return { bg: "bg-rose-50", text: "text-rose-800", border: "border-rose-200" };
    }
    return { bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200" };
  };

  const track = "track" in mentor ? (mentor as MentorFleetItem).track : "CODING";
  const email =
    "email" in mentor && (mentor as MentorFleetItem).email
      ? (mentor as MentorFleetItem).email
      : `${mentor.mentorName.toLowerCase().replace(/[^a-z0-9]/g, "")}@codeyoung.dev`;

  const badge = getTrackBadgeStyle(track);
  const isFull = mentor.assignedCount >= mentor.maxCapacity;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/45 backdrop-blur-xs"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="mentor-schedule-modal-title"
    >
      <div
        className="bg-white rounded-2xl border border-[#CBD5E1] shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-start justify-between gap-4 bg-white">
          <div className="flex items-center gap-3.5">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center text-sm font-mono font-bold shrink-0 border ${badge.bg} ${badge.text} ${badge.border}`}
            >
              {mentor.mentorCode.replace(/Mentor\s*/i, "")}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <Image
                  src="/primary_logo.png"
                  alt="Codeyoung"
                  width={100}
                  height={30}
                  className="h-5 w-auto object-contain mr-1"
                />
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                  ·
                </span>
                <h3
                  id="mentor-schedule-modal-title"
                  className="text-base sm:text-lg font-bold text-[#0F172A] tracking-tight"
                >
                  {mentor.mentorName}
                </h3>
                <span className="text-xs font-mono font-semibold text-slate-500">
                  ({mentor.mentorCode})
                </span>
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${badge.bg} ${badge.text} ${badge.border}`}
                >
                  {track}
                </span>
              </div>
              <div className="text-xs text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                <span className="font-mono">{email}</span>
                <span>·</span>
                <span>Asia/Kolkata (IST · UTC+5:30)</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Capacity Strip Banner */}
        <div className="px-5 sm:px-6 py-3 bg-[#F8FAFC] border-b border-[#CBD5E1] flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-600">Schedule for</span>
            <span className="font-bold text-[#0F172A]">{formatDisplayDate(selectedDate)}</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-[#0F172A]">
              <span>{mentor.assignedCount} / {mentor.maxCapacity} classes</span>
            </div>

            {/* Dual-segment yellow progress bar */}
            <div
              className="flex items-center gap-1"
              title={`${mentor.assignedCount} of ${mentor.maxCapacity} classes assigned`}
            >
              <div
                className={`w-6 h-2 rounded-xs transition-colors ${
                  mentor.assignedCount >= 1
                    ? isFull
                      ? "bg-[#D97706]"
                      : "bg-[#F5A623]"
                    : "bg-[#CBD5E1]"
                }`}
              />
              <div
                className={`w-6 h-2 rounded-xs transition-colors ${
                  mentor.assignedCount >= 2 ? "bg-[#D97706]" : "bg-[#CBD5E1]"
                }`}
              />
            </div>

            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                isFull
                  ? "bg-amber-100 text-[#784E00] border border-amber-300"
                  : mentor.assignedCount === 1
                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                  : "bg-emerald-50 text-emerald-800 border border-emerald-300"
              }`}
            >
              {isFull ? "Capped (2/2)" : mentor.assignedCount === 1 ? "Active (1/2)" : "Available (0/2)"}
            </span>
          </div>
        </div>

        {/* Scrollable Scheduled Bookings List */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 bg-[#F8FAFC]">
          {scheduledBookings.length === 0 ? (
            <div className="py-10 px-6 text-center rounded-2xl bg-white border border-[#CBD5E1] shadow-card">
              <div className="w-11 h-11 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3 border border-emerald-200">
                <Check className="w-5 h-5 stroke-[2.5]" />
              </div>
              <h4 className="text-base font-bold text-[#0F172A]">
                No classes scheduled for this date
              </h4>
              <p className="text-xs text-slate-600 mt-1 max-w-sm mx-auto leading-relaxed">
                {mentor.mentorName} has full availability with 0 of 2 daily classes assigned. Ready for automatic allocation when new parent bookings arrive.
              </p>
              <div className="mt-5 pt-3.5 border-t border-slate-100 inline-flex items-center gap-3 text-xs text-slate-600">
                <span>Working hours: 09:00 - 18:00 IST</span>
                <span className="text-slate-300">·</span>
                <span className="font-bold text-[#00A86B]">2 slots available</span>
              </div>
            </div>
          ) : (
            scheduledBookings.map((b, idx) => {
              const meetingUrl = b.classUrl;
              const isCopied = copiedId === b.id;

              return (
                <div
                  key={b.id}
                  className="bg-white rounded-2xl border border-[#CBD5E1] p-5 sm:p-6 shadow-card card-lift space-y-4"
                >
                  {/* Card Eyebrow */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#0F172A] bg-[#F1F5F9] px-2.5 py-1 rounded-lg border border-[#CBD5E1]/60">
                        Class #{idx + 1} · {b.id}
                      </span>
                      <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                        · 1-on-1 Trial Class
                      </span>
                    </div>

                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300/80 text-xs font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      {b.status}
                    </span>
                  </div>

                  {/* Main Time Display */}
                  <div className="space-y-1">
                    <div className="flex items-baseline justify-between gap-2 flex-wrap">
                      <p className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tabular-nums tracking-tight">
                        {b.slotIst}
                      </p>
                      <span className="text-xs text-slate-500 font-semibold">
                        30 minutes · 1-on-1 Interactive
                      </span>
                    </div>

                    {/* Dual-Timezone Comparison Notice */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs bg-[#F8FAFC] py-2.5 px-3.5 rounded-xl border border-[#CBD5E1]">
                      <div className="flex items-center gap-2 text-slate-800 font-semibold">
                        <Clock className="w-4 h-4 text-[#D98B0F] shrink-0" />
                        <span>Mentor: {b.slotIst} (IST · Asia/Kolkata)</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <Globe className="w-4 h-4 text-slate-500 shrink-0" />
                        <span>Parent: {b.parentLocalTime} ({b.timezoneDetail})</span>
                      </div>
                    </div>
                  </div>

                  {/* Parent Details Card */}
                  <div className="bg-[#F8FAFC] rounded-xl p-3 sm:p-3.5 border border-[#CBD5E1] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 text-slate-800 font-semibold">
                      <User className="w-4 h-4 text-slate-500 shrink-0" />
                      <span>{b.parentName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600 font-mono">
                      <Mail className="w-4 h-4 text-slate-500 shrink-0" />
                      <span className="truncate">{b.parentEmail}</span>
                    </div>
                  </div>

                  {/* Shared Class Meeting URL (Matching PostBookingActions.tsx) */}
                  <div className="bg-white border border-[#CBD5E1] p-3.5 sm:p-4 rounded-xl shadow-xs space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <Video className="w-3.5 h-3.5 text-[#D98B0F]" />
                        <span>Shared Class Meeting URL</span>
                      </span>
                      <span className="text-[11px] text-slate-400 hidden sm:inline">
                        Same link for Parent &amp; Mentor
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl p-2 sm:p-1.5 sm:pl-3">
                      <span
                        className="text-xs text-slate-700 font-mono truncate select-all flex-1 py-1"
                        title={meetingUrl}
                      >
                        {meetingUrl}
                      </span>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Copy Link Button */}
                        <button
                          type="button"
                          onClick={() => handleCopyLink(b.id, meetingUrl)}
                          className={`h-9 px-3.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            isCopied
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-300 font-bold"
                              : "bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 hover:text-slate-900 border border-[#CBD5E1] shadow-control"
                          }`}
                          title="Copy meeting link"
                        >
                          {isCopied ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                              <span>Link copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-slate-500" />
                              <span>Copy link</span>
                            </>
                          )}
                        </button>

                        {/* Join Class Button */}
                        <a
                          href={meetingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-9 px-3.5 rounded-lg text-xs font-bold bg-[#F5A623] hover:bg-[#E89918] active:bg-[#D98B0F] text-slate-950 flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                          title="Open meeting room"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Join class</span>
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-[#CBD5E1] bg-white flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-1.5 text-slate-700 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Class meeting URL verified from database booking record</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white border border-[#CBD5E1] text-[#0F172A] hover:bg-slate-50 font-bold transition-all shadow-control cursor-pointer ml-auto"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
