"use client";

import React, { useState } from "react";
import { ChevronLeft, ChevronRight, Calendar, ChevronDown } from "lucide-react";
import { DateItem } from "@/types/booking.types";
import { CalendarDatePickerPopover } from "./CalendarDatePickerPopover";

interface DatePickerStripProps {
  dates: readonly DateItem[];
  selectedDate: string;
  onSelectDate: (dateStr: string) => void;
  onPrev: () => void;
  onNext: () => void;
  currentMonthYear: string;
  isPrevDisabled?: boolean;
}

export function DatePickerStrip({
  dates,
  selectedDate,
  onSelectDate,
  onPrev,
  onNext,
  currentMonthYear,
  isPrevDisabled = false,
}: DatePickerStripProps) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  return (
    <div className="w-full bg-white border border-[#CBD5E1] rounded-2xl p-4 sm:p-5 shadow-card">
      {/* Header with Title and Month Navigation */}
      <div className="flex items-center justify-between mb-3.5">
        <h3 className="text-sm font-bold text-slate-900 tracking-tight">Choose a date</h3>

        <div className="relative flex items-center gap-1.5">
          {/* Calendar Picker Trigger */}
          <button
            type="button"
            onClick={() => setIsCalendarOpen((prev) => !prev)}
            aria-label="Open full month calendar picker"
            aria-expanded={isCalendarOpen}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] hover:bg-white hover:border-[#D98B0F] text-xs font-semibold text-slate-800 transition-all shadow-control cursor-pointer select-none focus:outline-none"
          >
            <Calendar className="w-3.5 h-3.5 text-[#D98B0F]" />
            <span>{currentMonthYear}</span>
            <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${isCalendarOpen ? "rotate-180" : ""}`} />
          </button>

          {/* Quick 5-day pagination controls */}
          <button
            type="button"
            onClick={onPrev}
            disabled={isPrevDisabled}
            aria-label="Previous dates"
            className={`p-1.5 rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] transition-all shadow-control focus:outline-none ${
              isPrevDisabled
                ? "opacity-30 cursor-not-allowed text-slate-400"
                : "text-slate-700 hover:text-slate-950 hover:bg-white hover:border-slate-400 cursor-pointer active:scale-[0.98]"
            }`}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onNext}
            aria-label="Next dates"
            className="p-1.5 rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] text-slate-700 hover:text-slate-950 hover:bg-white hover:border-slate-400 transition-all shadow-control cursor-pointer focus:outline-none active:scale-[0.98]"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          {/* Direct Calendar Popover */}
          {isCalendarOpen && (
            <CalendarDatePickerPopover
              selectedDate={selectedDate}
              onSelectDate={(newDate) => {
                onSelectDate(newDate);
                setIsCalendarOpen(false);
              }}
              onClose={() => setIsCalendarOpen(false)}
            />
          )}
        </div>
      </div>

      {/* Date Buttons Strip */}
      <div className="grid grid-cols-5 gap-2 sm:gap-2.5">
        {dates.map((item) => {
          const isSelected = item.dateStr === selectedDate;
          return (
            <button
              key={item.dateStr}
              type="button"
              onClick={() => onSelectDate(item.dateStr)}
              aria-pressed={isSelected}
              className={`date-btn flex flex-col items-center justify-center py-2.5 px-2 rounded-xl cursor-pointer text-center select-none ${
                isSelected
                  ? "bg-[#F5A623] text-slate-950 font-bold border border-[#D98B0F] shadow-xs ring-2 ring-[#F5A623]/30"
                  : "bg-[#F8FAFC] text-slate-800 border border-[#CBD5E1] hover:border-slate-400 hover:bg-white shadow-control"
              }`}
            >
              <span
                className={`text-[11px] font-semibold tracking-wider uppercase ${
                  isSelected ? "text-slate-950/80" : "text-slate-500"
                }`}
              >
                {item.dayName}
              </span>
              <span
                className={`text-lg font-bold mt-0.5 tabular-nums leading-tight ${
                  isSelected ? "text-slate-950" : "text-slate-900"
                }`}
              >
                {item.dayNumber}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
