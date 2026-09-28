"use client";

import React from "react";
import { ArrowRight, Loader2, AlertCircle } from "lucide-react";
import { Slot } from "@/types/booking.types";
import { PreferredTimePicker } from "./PreferredTimePicker";

interface TimeSlotGridProps {
  slots: readonly Slot[];
  selectedSlotTime: string;
  onSelectSlot: (slot: Slot) => void;
  onContinue: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  error?: string | null;
  preferredTime?: string | null;
  preferredSlotStatus?: 'IDLE' | 'CHECKING' | 'AVAILABLE' | 'UNAVAILABLE';
  preferredSlotMessage?: string | null;
  onSelectPreferredTime?: (time: string | null) => void;
}

export function TimeSlotGrid({
  slots,
  selectedSlotTime,
  onContinue,
  onSelectSlot,
  disabled = false,
  isLoading = false,
  error = null,
  preferredTime = null,
  preferredSlotStatus = 'IDLE',
  preferredSlotMessage = null,
  onSelectPreferredTime,
}: TimeSlotGridProps) {
  const morningSlots = slots.filter((s) => s.period === "MORNING");
  const afternoonSlots = slots.filter((s) => s.period === "AFTERNOON");
  const eveningSlots = slots.filter((s) => s.period === "EVENING");
  const totalAvailable = slots.length;

  return (
    <div className="w-full bg-white border border-[#CBD5E1] rounded-2xl p-6 sm:p-7 shadow-card">
      {/* Header */}
      <div className="pb-4 border-b border-slate-100 flex items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 tracking-tight">Available times</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            All times are shown in your local timezone.
          </p>
        </div>
        {!isLoading && !error && (
          <span className="text-xs font-semibold text-slate-600 bg-slate-100/80 px-2.5 py-1 rounded-full border border-slate-200 shrink-0">
            {totalAvailable} available
          </span>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="mt-8 p-12 rounded-2xl border border-[#CBD5E1] bg-slate-50/50 text-center anim-fade-in-scale">
          <Loader2 className="w-8 h-8 text-[#F5A623] animate-spin mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-900">Loading available times...</p>
          <p className="text-xs text-slate-500 mt-1.5 max-w-sm mx-auto leading-relaxed">
            Checking mentor availability for your selected date and timezone.
          </p>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="mt-8 p-8 rounded-2xl border border-red-200 bg-red-50/50 text-center anim-fade-in-scale">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-3" />
          <p className="text-sm font-bold text-red-900">Unable to load availability</p>
          <p className="text-xs text-red-600 mt-1.5 max-w-sm mx-auto leading-relaxed">
            {error}
          </p>
          <p className="text-xs text-slate-500 mt-2">
            Please try selecting a different date or refresh the page.
          </p>
        </div>
      )}

      {/* Morning Slots */}
      {!isLoading && !error && morningSlots.length > 0 && (
        <div className="mt-5 anim-fade-up">
          <h4 className="text-[11px] font-bold tracking-wider text-slate-400 uppercase mb-2.5 select-none">
            MORNING
          </h4>
          <div className="grid grid-cols-3 gap-2.5">
            {morningSlots.map((slot) => {
              const isSelected = slot.time === selectedSlotTime;
              return (
                <button
                  key={slot.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => onSelectSlot(slot)}
                  aria-pressed={isSelected}
                  className={`slot-btn py-3 px-2 rounded-xl text-xs sm:text-sm font-semibold tabular-nums text-center cursor-pointer select-none ${
                    isSelected
                      ? "is-selected bg-[#F5A623] text-slate-950 font-bold border border-[#D98B0F] shadow-xs ring-2 ring-[#F5A623]/30"
                      : "bg-[#F8FAFC] text-slate-800 border border-[#CBD5E1] hover:border-amber-400 hover:bg-amber-50/30 shadow-control"
                  }`}
                >
                  {slot.time}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Afternoon Slots */}
      {!isLoading && !error && afternoonSlots.length > 0 && (
        <div className="mt-6 anim-fade-up">
          <h4 className="text-[11px] font-bold tracking-wider text-slate-400 uppercase mb-2.5 select-none">
            AFTERNOON
          </h4>
          <div className="grid grid-cols-3 gap-2.5">
            {afternoonSlots.map((slot) => {
              const isSelected = slot.time === selectedSlotTime;
              return (
                <button
                  key={slot.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => onSelectSlot(slot)}
                  aria-pressed={isSelected}
                  className={`slot-btn py-3 px-2 rounded-xl text-xs sm:text-sm font-semibold tabular-nums text-center cursor-pointer select-none ${
                    isSelected
                      ? "is-selected bg-[#F5A623] text-slate-950 font-bold border border-[#D98B0F] shadow-xs ring-2 ring-[#F5A623]/30"
                      : "bg-[#F8FAFC] text-slate-800 border border-[#CBD5E1] hover:border-amber-400 hover:bg-amber-50/30 shadow-control"
                  }`}
                >
                  {slot.time}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Evening Slots */}
      {!isLoading && !error && eveningSlots.length > 0 && (
        <div className="mt-6 anim-fade-up">
          <h4 className="text-[11px] font-bold tracking-wider text-slate-400 uppercase mb-2.5 select-none">
            EVENING
          </h4>
          <div className="grid grid-cols-3 gap-2.5">
            {eveningSlots.map((slot) => {
              const isSelected = slot.time === selectedSlotTime;
              return (
                <button
                  key={slot.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => onSelectSlot(slot)}
                  aria-pressed={isSelected}
                  className={`slot-btn py-3 px-2 rounded-xl text-xs sm:text-sm font-semibold tabular-nums text-center cursor-pointer select-none ${
                    isSelected
                      ? "is-selected bg-[#F5A623] text-slate-950 font-bold border border-[#D98B0F] shadow-xs ring-2 ring-[#F5A623]/30"
                      : "bg-[#F8FAFC] text-slate-800 border border-[#CBD5E1] hover:border-amber-400 hover:bg-amber-50/30 shadow-control"
                  }`}
                >
                  {slot.time}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && morningSlots.length === 0 && afternoonSlots.length === 0 && eveningSlots.length === 0 && (
        <div className="mt-8 p-8 rounded-2xl border border-dashed border-[#CBD5E1] bg-slate-50/50 text-center anim-fade-in-scale">
          <p className="text-sm font-bold text-slate-900">No classes available on this date</p>
          <p className="text-xs text-slate-500 mt-1.5 max-w-sm mx-auto leading-relaxed">
            There are no available trial slots for this date in your selected timezone. Please select another date from the date strip above.
          </p>
        </div>
      )}

      {/* Secondary Option: Your Preferred Time */}
      {!isLoading && !error && (
        <PreferredTimePicker
          initialTime={preferredTime}
          status={preferredSlotStatus}
          statusMessage={preferredSlotMessage}
          onPreferredTimeChange={onSelectPreferredTime}
        />
      )}

      {/* Continue CTA Button */}
      <div className="mt-8">
        <button
          type="button"
          onClick={onContinue}
          disabled={!selectedSlotTime || disabled || isLoading || !!error}
          className="btn-primary-shimmer w-full bg-[#F5A623] hover:bg-[#E89918] active:bg-[#D98B0F] text-slate-950 font-bold py-3.5 px-6 rounded-xl shadow-xs flex items-center justify-center gap-2 text-sm sm:text-base cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40"
        >
          <span>Continue</span>
          <ArrowRight className="w-4 h-4 text-slate-950" />
        </button>

        {/* Microcopy assurance */}
        <p className="text-xs text-slate-500 text-center mt-3 font-normal">
          No credit card required · Free 30-min trial · Cancel anytime
        </p>
      </div>
    </div>
  );
}
