"use client";

import React, { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CalendarDatePickerPopoverProps {
  selectedDate: string;
  onSelectDate: (dateStr: string) => void;
  onClose: () => void;
  minDateStr?: string;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const WEEKDAY_HEADERS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export function CalendarDatePickerPopover({
  selectedDate,
  onSelectDate,
  onClose,
  minDateStr = "2026-09-28",
}: CalendarDatePickerPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);

  // Parse initial view from selectedDate
  const initialYear = parseInt(selectedDate.slice(0, 4), 10) || 2026;
  const initialMonth = parseInt(selectedDate.slice(5, 7), 10) - 1 || 8; // 0-indexed

  const [viewYear, setViewYear] = useState(initialYear);
  const [viewMonth, setViewMonth] = useState(initialMonth);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  // Navigation limits (don't navigate before minimum month)
  const minYear = parseInt(minDateStr.slice(0, 4), 10);
  const minMonth = parseInt(minDateStr.slice(5, 7), 10) - 1;
  const isPrevMonthDisabled = viewYear < minYear || (viewYear === minYear && viewMonth <= minMonth);

  const handlePrevMonth = () => {
    if (isPrevMonthDisabled) return;
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((prev) => prev - 1);
    } else {
      setViewMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((prev) => prev + 1);
    } else {
      setViewMonth((prev) => prev + 1);
    }
  };

  // Calendar matrix calculation
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const totalDaysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const daysArray = Array.from({ length: totalDaysInMonth }, (_, i) => i + 1);
  const paddingArray = Array.from({ length: firstDayOfWeek }, (_, i) => i);

  return (
    <div
      ref={popoverRef}
      role="dialog"
      aria-label="Calendar date picker"
      className="absolute right-0 top-full mt-2 z-50 w-72 bg-white rounded-2xl shadow-xl border border-[#CBD5E1] p-4.5 popover-enter select-none"
    >
      {/* Popover Header: Month & Navigation Arrows */}
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-bold text-[#0F172A] tracking-tight">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </h4>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handlePrevMonth}
            disabled={isPrevMonthDisabled}
            aria-label="Previous month"
            className={`p-1.5 rounded-lg border border-[#CBD5E1] transition-all ${
              isPrevMonthDisabled
                ? "opacity-30 cursor-not-allowed text-slate-400 bg-transparent"
                : "text-slate-700 hover:text-slate-950 hover:bg-slate-50 cursor-pointer shadow-control"
            }`}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            aria-label="Next month"
            className="p-1.5 rounded-lg border border-[#CBD5E1] text-slate-700 hover:text-slate-950 hover:bg-slate-50 transition-all shadow-control cursor-pointer"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Weekday Labels */}
      <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
        {WEEKDAY_HEADERS.map((day, idx) => (
          <span
            key={day}
            className={`text-[10px] font-bold tracking-wider ${
              idx === 0 ? "text-rose-500" : "text-slate-400"
            }`}
          >
            {day}
          </span>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Leading blank padding */}
        {paddingArray.map((i) => (
          <div key={`pad-${i}`} className="w-8 h-8" />
        ))}

        {/* Days of current month */}
        {daysArray.map((day) => {
          const monthStr = String(viewMonth + 1).padStart(2, "0");
          const dayStr = String(day).padStart(2, "0");
          const dateStr = `${viewYear}-${monthStr}-${dayStr}`;

          const dayOfWeek = new Date(viewYear, viewMonth, day).getDay();
          const isSunday = dayOfWeek === 0;
          const isPast = dateStr < minDateStr;
          const isSelected = dateStr === selectedDate;
          const isDisabled = isPast || isSunday;

          return (
            <button
              key={dateStr}
              type="button"
              disabled={isDisabled}
              onClick={() => {
                onSelectDate(dateStr);
                onClose();
              }}
              title={
                isSunday
                  ? "Sundays are closed"
                  : isPast
                  ? "Past date"
                  : `Select ${dateStr}`
              }
              className={`w-8 h-8 rounded-lg text-xs font-semibold flex items-center justify-center transition-all ${
                isSelected
                  ? "bg-[#F5A623] text-slate-950 font-bold border border-[#D98B0F] shadow-xs ring-2 ring-[#F5A623]/30"
                  : isDisabled
                  ? "text-slate-300 cursor-not-allowed bg-transparent"
                  : "text-[#0F172A] hover:bg-amber-50 hover:text-amber-950 cursor-pointer"
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>

      {/* Footer Helper Note */}
      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
        <span>Classes run Mon – Sat</span>
        <button
          type="button"
          onClick={() => {
            onSelectDate(minDateStr);
            onClose();
          }}
          className="text-[11px] font-semibold text-[#D98B0F] hover:underline cursor-pointer"
        >
          Earliest
        </button>
      </div>
    </div>
  );
}
