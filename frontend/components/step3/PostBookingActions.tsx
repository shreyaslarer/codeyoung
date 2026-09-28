"use client";

import React, { useState, useRef, useEffect } from "react";
import { Calendar, Check, Copy, Download, Mail } from "lucide-react";

export interface PostBookingActionsProps {
  meetingUrl?: string;
  onBookAnother?: () => void;
  startIsoInstant?: string;
  parentEmail?: string;
  initialCopyStatus?: "idle" | "copied" | "error";
}

export function formatUtcToCalendarString(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function calculateDateRange(startIsoInstant?: string): { startCal: string; endCal: string } {
  try {
    const startDate = startIsoInstant ? new Date(startIsoInstant) : new Date(Date.now() + 86400000);
    if (isNaN(startDate.getTime())) {
      throw new Error("Invalid start date");
    }
    const endDate = new Date(startDate.getTime() + 30 * 60 * 1000);
    return {
      startCal: formatUtcToCalendarString(startDate),
      endCal: formatUtcToCalendarString(endDate),
    };
  } catch {
    return {
      startCal: "20260929T090000Z",
      endCal: "20260929T093000Z",
    };
  }
}

export function generateGoogleCalendarUrl(classUrl: string, startCal: string, endCal: string): string {
  const title = encodeURIComponent("Codeyoung 1-on-1 Trial Class");
  const details = encodeURIComponent(
    `Your Codeyoung 1-on-1 Trial Class is scheduled.\nMentor assigned automatically based on learner profile.\nClassroom Link: ${classUrl}`
  );
  const location = encodeURIComponent(classUrl);
  const dates = `${startCal}/${endCal}`;
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=${location}`;
}

export function generateIcsData(classUrl: string, startCal: string, endCal: string): string {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Codeyoung//Trial Class Booking//EN",
    "BEGIN:VEVENT",
    "SUMMARY:Codeyoung 1-on-1 Trial Class",
    `DESCRIPTION:Trial class with your dedicated STEM & coding mentor.\\nJoin here: ${classUrl}`,
    `DTSTART:${startCal}`,
    `DTEND:${endCal}`,
    `LOCATION:${classUrl}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (
      typeof navigator !== "undefined" &&
      navigator.clipboard &&
      typeof navigator.clipboard.writeText === "function"
    ) {
      await navigator.clipboard.writeText(text);
      return true;
    } else if (typeof document !== "undefined") {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      textArea.style.top = "0";
      textArea.setAttribute("aria-hidden", "true");
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const success = document.execCommand("copy");
      document.body.removeChild(textArea);
      return Boolean(success);
    }
    return false;
  } catch {
    return false;
  }
}

export function PostBookingActions({
  meetingUrl,
  onBookAnother,
  startIsoInstant,
  parentEmail,
  initialCopyStatus = "idle",
}: PostBookingActionsProps) {
  // Use provided URL exactly or fallback to prototype classroom URL
  const classUrl = meetingUrl || "https://meet.codeyoung.com/trial/room-cy-2026";

  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">(initialCopyStatus);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  const handleAddToGoogleCalendar = () => {
    if (typeof window === "undefined") return;
    const { startCal, endCal } = calculateDateRange(startIsoInstant);
    const url = generateGoogleCalendarUrl(classUrl, startCal, endCal);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleDownloadIcs = () => {
    if (typeof window === "undefined" || typeof document === "undefined") return;
    const { startCal, endCal } = calculateDateRange(startIsoInstant);
    const icsData = generateIcsData(classUrl, startCal, endCal);

    const blob = new Blob([icsData], { type: "text/calendar;charset=utf-8" });
    const link = document.createElement("a");
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute("download", "codeyoung-trial-class.ics");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(link.href);
  };

  const handleCopyClassUrl = async () => {
    if (copyTimeoutRef.current) {
      clearTimeout(copyTimeoutRef.current);
    }

    const success = await copyTextToClipboard(classUrl);

    if (success) {
      setCopyStatus("copied");
      copyTimeoutRef.current = setTimeout(() => {
        setCopyStatus("idle");
      }, 3000);
    } else {
      setCopyStatus("error");
      copyTimeoutRef.current = setTimeout(() => {
        setCopyStatus("idle");
      }, 3000);
    }
  };

  return (
    <div className="flex flex-col items-center w-full">
      {/* 1. Three balanced action areas across desktop width */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
        {/* Action Area 1: Google Calendar (Primary Save Action) */}
        <div className="bg-white border border-[#CBD5E1] rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between shadow-card card-lift">
          <div>
            <div className="flex items-center justify-between gap-1 mb-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                <Calendar className="w-4 h-4 text-[#D98B0F] shrink-0" aria-hidden="true" />
                <span>Google Calendar</span>
              </div>
              <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200/80 px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                Primary
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed mb-3">
              Add this trial class directly to your Google Calendar.
            </p>
          </div>

          <button
            type="button"
            onClick={handleAddToGoogleCalendar}
            className="btn-primary-shimmer w-full h-10 px-3 bg-[#F5A623] hover:bg-[#E89918] active:bg-[#D98B0F] text-slate-950 font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-1.5 shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F5A623]/40 cursor-pointer transition-all"
            aria-label="Add to Google Calendar"
          >
            <Calendar className="w-3.5 h-3.5 text-slate-950 shrink-0" aria-hidden="true" />
            <span>Add to Google Calendar</span>
          </button>
        </div>

        {/* Action Area 2: Calendar File (Secondary Action) */}
        <div className="bg-white border border-[#CBD5E1] rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between shadow-card card-lift">
          <div>
            <div className="flex items-center justify-between gap-1 mb-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                <Download className="w-4 h-4 text-slate-500 shrink-0" aria-hidden="true" />
                <span>Calendar file</span>
              </div>
              <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded-full">
                .ics
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed mb-3">
              Download standard calendar file for Apple &amp; Outlook.
            </p>
          </div>

          <button
            type="button"
            onClick={handleDownloadIcs}
            className="w-full h-10 px-3 rounded-xl border border-[#CBD5E1] bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 hover:text-slate-950 font-semibold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-control transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 cursor-pointer"
            aria-label="Download calendar file (.ics)"
          >
            <Download className="w-3.5 h-3.5 text-slate-500 shrink-0" aria-hidden="true" />
            <span>Download calendar file (.ics)</span>
          </button>
        </div>

        {/* Action Area 3: Class Link (Immediately Accessible) */}
        <div className="bg-white border border-[#CBD5E1] rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between shadow-card card-lift">
          <div>
            <div className="flex items-center justify-between gap-1 mb-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                <Copy className="w-4 h-4 text-slate-500 shrink-0" aria-hidden="true" />
                <span>Class link</span>
              </div>
              <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded-full">
                Virtual Room
              </span>
            </div>
            <div className="bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg px-2 py-1 mb-3">
              <span
                className="text-[11px] text-slate-600 font-mono truncate block select-all"
                title={classUrl}
                data-testid="class-url-text"
              >
                {classUrl}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopyClassUrl}
            className={`w-full h-10 px-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer focus:outline-none focus-visible:ring-2 ${
              copyStatus === "copied"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-300 focus-visible:ring-emerald-500"
                : copyStatus === "error"
                ? "bg-red-50 text-red-700 border border-red-300 focus-visible:ring-red-500"
                : "bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 hover:text-slate-900 border border-[#CBD5E1] shadow-control focus-visible:ring-slate-400"
            }`}
            aria-label={
              copyStatus === "copied"
                ? "Link copied"
                : copyStatus === "error"
                ? "Copy failed. Please copy link manually"
                : "Copy class link"
            }
          >
            {copyStatus === "copied" ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" aria-hidden="true" />
                <span className="font-bold">Link copied</span>
              </>
            ) : copyStatus === "error" ? (
              <>
                <Copy className="w-3.5 h-3.5 text-red-500" aria-hidden="true" />
                <span>Copy failed</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                <span>Copy class link</span>
              </>
            )}
          </button>
          {/* Polite live region for screen readers */}
          <div className="sr-only" role="status" aria-live="polite">
            {copyStatus === "copied" && "Link copied"}
            {copyStatus === "error" && "Copy failed. Please copy link manually."}
          </div>
        </div>
      </div>

      {/* 2. Secondary Reassurance & Navigation Strip */}
      <div className="w-full mt-3 bg-white border border-[#CBD5E1] rounded-2xl p-3 sm:px-4 sm:py-3 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-card card-lift">
        <div className="text-xs text-slate-600 min-w-0 flex-1 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-1.5 font-medium text-slate-700">
            <Mail className="w-4 h-4 text-slate-500 shrink-0" aria-hidden="true" />
            <span className="truncate">
              {parentEmail
                ? `A confirmation has been sent to ${parentEmail}.`
                : "A confirmation has been prepared for your email."}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5 leading-normal">
            You can use the email to access your booking details, test your setup, or reschedule anytime.
          </p>
        </div>

        {onBookAnother && (
          <button
            type="button"
            onClick={onBookAnother}
            className="text-xs font-semibold text-slate-700 hover:text-slate-950 py-2 px-3.5 rounded-xl border border-[#CBD5E1] bg-white hover:bg-slate-50 transition-all duration-150 cursor-pointer shrink-0 shadow-control focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            Book another session
          </button>
        )}
      </div>
    </div>
  );
}
