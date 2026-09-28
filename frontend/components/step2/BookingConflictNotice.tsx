import React from "react";
import { Clock, AlertCircle, ArrowRight } from "lucide-react";
import type { BookingConflictType } from "@/types/api.types";

interface BookingConflictNoticeProps {
  /** Conflict type from a 409 response. Null = no conflict to show. */
  conflictType: BookingConflictType | null;
  /** Non-conflict error (network failure, server error, validation). Null = no error. */
  errorMessage: string | null;
  /** Called when parent clicks "Choose another time". */
  onChooseAnotherTime: () => void;
}

/**
 * Renders the appropriate inline notice when a booking attempt fails.
 *
 * Two visual states:
 *   1. Conflict (409) — calm, informational, amber-warm tone.
 *      The slot is taken; recovery is a normal scheduling step.
 *   2. Unexpected error — red, alerting.
 *      Network or server failure; parent cannot self-recover.
 *
 * Design-skill §40: "That time was just booked. Please choose another
 * available time." — not an error page, not a dramatic alert, normal flow.
 */
export function BookingConflictNotice({
  conflictType,
  errorMessage,
  onChooseAnotherTime,
}: BookingConflictNoticeProps) {
  if (!conflictType && !errorMessage) return null;

  if (conflictType) {
    return (
      <div
        role="status"
        aria-live="polite"
        className={[
          "mb-5 rounded-xl border border-amber-200 bg-amber-50/70 p-4 sm:p-4.5",
          "motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200",
        ].join(" ")}
      >
        <div className="flex items-start gap-3.5">
          {/* Icon: clock — communicates "scheduling state", not error */}
          <div className="mt-0.5 shrink-0 w-8 h-8 rounded-full bg-amber-100 border border-amber-200/80 flex items-center justify-center">
            <Clock className="w-4 h-4 text-amber-700" aria-hidden="true" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-amber-900 leading-snug">
              That time is no longer available
            </h3>
            <p className="text-xs text-amber-800/85 mt-1 leading-relaxed">
              All available mentors are booked for this time. Please choose another time.
            </p>

            {/* Obvious recovery action CTA to return to the available time slots */}
            <div className="mt-3">
              <button
                type="button"
                onClick={onChooseAnotherTime}
                className={[
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg",
                  "bg-amber-100 hover:bg-amber-200/80 active:bg-amber-200",
                  "border border-amber-300/80 text-xs font-semibold text-amber-950",
                  "transition-colors cursor-pointer",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:ring-offset-1",
                ].join(" ")}
              >
                <span>Choose another time</span>
                <ArrowRight className="w-3.5 h-3.5 text-amber-900" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Unexpected error: network failure, server error, or unclassified.
  return (
    <div
      role="alert"
      aria-live="assertive"
      className={[
        "mb-5 rounded-xl border border-red-200 bg-red-50/60 px-4 py-3.5",
        "motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200",
      ].join(" ")}
    >
      <div className="flex items-start gap-3">
        <AlertCircle
          className="mt-0.5 w-4 h-4 text-red-500 shrink-0"
          aria-hidden="true"
        />
        <p className="text-xs font-medium text-red-700 leading-relaxed">
          {errorMessage}
        </p>
      </div>
    </div>
  );
}
