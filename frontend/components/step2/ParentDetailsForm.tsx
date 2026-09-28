"use client";

import React from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { BookingConflictNotice } from "./BookingConflictNotice";
import type { BookingConflictType } from "@/types/api.types";

interface ParentDetailsFormProps {
  parentName: string;
  parentEmail: string;
  onNameChange: (name: string) => void;
  onEmailChange: (email: string) => void;
  onConfirm: () => void;
  onChangeTime: () => void;
  isSubmitting?: boolean;
  /**
   * Set when a 409 Conflict is returned by the backend.
   * Renders a calm scheduling-state notice instead of a red error.
   */
  submitConflict?: BookingConflictType | null;
  /**
   * Non-conflict error message (network, server, local validation).
   * Renders a red alert notice.
   */
  errorMessage?: string | null;
}

export function ParentDetailsForm({
  parentName,
  parentEmail,
  onNameChange,
  onEmailChange,
  onConfirm,
  onChangeTime,
  isSubmitting = false,
  submitConflict = null,
  errorMessage = null,
}: ParentDetailsFormProps) {
  const [localError, setLocalError] = React.useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    const trimmedName = parentName.trim();
    if (trimmedName.length < 2) {
      setLocalError("Please enter a valid parent name with at least 2 characters.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(parentEmail.trim())) {
      setLocalError("Please enter a valid email address.");
      return;
    }

    onConfirm();
  };

  // Non-conflict errors: server/network/validation.
  const nonConflictError = localError ?? errorMessage ?? null;

  return (
    <div className="bg-white border border-[#CBD5E1] rounded-2xl p-6 sm:p-8 shadow-card flex flex-col">
      <h2 className="text-lg font-bold text-slate-900 mb-5">
        Your details
      </h2>

      {/* Conflict / error notice */}
      <BookingConflictNotice
        conflictType={submitConflict}
        errorMessage={nonConflictError}
        onChooseAnotherTime={onChangeTime}
      />

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* Field 1: Parent Name */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="parent-name"
            className="text-sm font-semibold text-slate-800"
          >
            Parent&apos;s name
          </label>
          <input
            id="parent-name"
            name="parent-name"
            type="text"
            required
            disabled={isSubmitting}
            value={parentName}
            onChange={(e) => {
              setLocalError(null);
              onNameChange(e.target.value);
            }}
            placeholder="Enter your name"
            className="w-full h-[46px] px-3.5 rounded-lg bg-[#F8FAFC] focus:bg-white border border-[#CBD5E1] text-[#0F172A] text-[15px] placeholder:text-slate-400 focus:outline-none focus:border-[#D98B0F] focus:ring-2 focus:ring-[#F5A623]/25 transition-all duration-200 shadow-control disabled:bg-slate-100 disabled:cursor-not-allowed"
          />
        </div>

        {/* Field 2: Email Address */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="parent-email"
            className="text-sm font-semibold text-slate-800"
          >
            Email address
          </label>
          <input
            id="parent-email"
            name="parent-email"
            type="email"
            required
            disabled={isSubmitting}
            value={parentEmail}
            onChange={(e) => {
              setLocalError(null);
              onEmailChange(e.target.value);
            }}
            placeholder="you@example.com"
            className="w-full h-[46px] px-3.5 rounded-lg bg-[#F8FAFC] focus:bg-white border border-[#CBD5E1] text-[#0F172A] text-[15px] placeholder:text-slate-400 focus:outline-none focus:border-[#D98B0F] focus:ring-2 focus:ring-[#F5A623]/25 transition-all duration-200 shadow-control disabled:bg-slate-100 disabled:cursor-not-allowed"
          />
          <p className="text-xs text-slate-500 mt-0.5">
            Class link and calendar invite will be sent to this email.
          </p>
        </div>

        {/* Actions Area */}
        <div className="pt-3 flex flex-col gap-4">
          <div className="flex items-center gap-4 flex-wrap">
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary-shimmer h-[46px] min-w-[190px] px-6 rounded-xl bg-[#F5A623] hover:bg-[#E89918] active:bg-[#D98B0F] text-slate-950 text-sm font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F5A623]/40 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  <span>Confirming...</span>
                </>
              ) : (
                <>
                  <span>Confirm booking</span>
                  <ArrowRight className="w-4 h-4 text-slate-950" />
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onChangeTime}
              disabled={isSubmitting}
              className="text-sm font-medium text-slate-600 hover:text-slate-950 py-2 px-1 transition-colors duration-150 cursor-pointer focus:outline-none disabled:opacity-40"
            >
              Change time
            </button>
          </div>

          {/* Reassurance Microcopy */}
          <p className="text-xs text-slate-500 max-w-[480px] leading-relaxed">
            A mentor will be assigned automatically after booking. Your details are used only to
            arrange your trial class.
          </p>
        </div>
      </form>
    </div>
  );
}
