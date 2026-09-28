"use client";

import React, { useState, useRef, useEffect } from "react";
import { Clock, ChevronDown, Check, X, Loader2 } from "lucide-react";

interface PreferredTimePickerProps {
  /** Optional callback if parent component wants to observe the local preference */
  onPreferredTimeChange?: (time: string | null) => void;
  /** Optional initial time string (e.g. "10:15 AM") */
  initialTime?: string | null;
  /** Real-time availability check status from backend */
  status?: 'IDLE' | 'CHECKING' | 'AVAILABLE' | 'UNAVAILABLE';
  /** Feedback message regarding availability */
  statusMessage?: string | null;
}

const HOURS = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
const MINUTES = ["00", "15", "30", "45"];

function parseTime(timeStr: string | null | undefined) {
  if (!timeStr) return { h: "10", m: "15", p: "AM" as const };
  const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match) {
    const h = match[1].padStart(2, "0");
    const m = match[2];
    const p = match[3].toUpperCase() as "AM" | "PM";
    return { h, m, p };
  }
  return { h: "10", m: "15", p: "AM" as const };
}

/**
 * "Your Preferred Time" Secondary Scheduling Control.
 *
 * Refined compact control: a single clearly labeled field showing the
 * selected value (e.g. "10:15 AM") with a subtle dropdown popover containing
 * hour, minute, and AM/PM selection.
 *
 * Evaluated by backend availability engine: requests exact 30-min interval
 * from backend, verifying mentor working hours, overlap, and capacity.
 */
export function PreferredTimePicker({
  onPreferredTimeChange,
  initialTime = null,
  status = 'IDLE',
  statusMessage = null,
}: PreferredTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [preferredTime, setPreferredTime] = useState<string | null>(initialTime);

  // Sync state if initialTime changes from parent
  useEffect(() => {
    setPreferredTime(initialTime ?? null);
  }, [initialTime]);

  const initialParsed = parseTime(initialTime);
  const [selectedHour, setSelectedHour] = useState(initialParsed.h);
  const [selectedMinute, setSelectedMinute] = useState(initialParsed.m);
  const [selectedPeriod, setSelectedPeriod] = useState<"AM" | "PM">(initialParsed.p);

  const containerRef = useRef<HTMLDivElement>(null);

  // Synchronize internal hour/min/period when popover opens with an existing time
  const handleToggleOpen = () => {
    if (!isOpen && preferredTime) {
      const parsed = parseTime(preferredTime);
      setSelectedHour(parsed.h);
      setSelectedMinute(parsed.m);
      setSelectedPeriod(parsed.p);
    }
    setIsOpen((prev) => !prev);
  };

  // Close popover when clicking outside or pressing Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleApplyCustomTime = () => {
    const customTime = `${selectedHour}:${selectedMinute} ${selectedPeriod}`;
    setPreferredTime(customTime);
    onPreferredTimeChange?.(customTime);
    setIsOpen(false);
  };

  const handleClear = (e?: React.MouseEvent | React.KeyboardEvent) => {
    e?.stopPropagation();
    setPreferredTime(null);
    onPreferredTimeChange?.(null);
    setIsOpen(false);
  };

  return (
    <div
      ref={containerRef}
      className="w-full relative mt-6 pt-5 border-t border-slate-100"
      data-testid="preferred-time-container"
    >
      {/* Compact Secondary Header */}
      <div className="flex items-center justify-between mb-1.5">
        <label
          htmlFor="preferred-time-trigger"
          className="text-xs font-semibold text-slate-600 flex items-center gap-1.5 cursor-pointer"
        >
          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
          <span>Your preferred time</span>
          <span className="font-normal text-slate-400 text-[11px]">(optional preference)</span>
        </label>
      </div>

      {/* Single Clearly Labeled Field */}
      <div className="relative">
        <button
          id="preferred-time-trigger"
          type="button"
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          aria-label={
            preferredTime
              ? `Your preferred time: ${preferredTime}`
              : "Choose your preferred time"
          }
          onClick={handleToggleOpen}
          className={`w-full h-11 px-3.5 rounded-xl border text-left flex items-center justify-between gap-2.5 transition-colors cursor-pointer shadow-control focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F5A623]/30 ${
            preferredTime
              ? "bg-amber-50/40 border-amber-300/80 text-slate-900"
              : "bg-white hover:border-slate-400 border-[#CBD5E1] text-slate-700"
          }`}
          data-testid="preferred-time-trigger"
        >
          <div className="flex items-center gap-2.5 truncate">
            {preferredTime ? (
              <span
                className="text-sm font-semibold text-slate-900 truncate"
                data-testid="preferred-time-value"
              >
                {preferredTime}
              </span>
            ) : (
              <span className="text-sm font-normal text-slate-400 truncate">
                Select a preferred time (e.g. 10:15 AM)
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {preferredTime && (
              <span
                role="button"
                tabIndex={0}
                aria-label="Reset preferred time"
                onClick={handleClear}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    handleClear(e);
                  }
                }}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                data-testid="reset-preferred-time"
              >
                <X className="w-3.5 h-3.5" />
              </span>
            )}
            <ChevronDown
              className={`w-4 h-4 text-slate-400 transition-transform duration-150 ${
                isOpen ? "rotate-180 text-slate-600" : ""
              }`}
              aria-hidden="true"
            />
          </div>
        </button>

        {/* Microcopy explaining this is a preference */}
        <p className="text-[11px] text-slate-500 mt-1 leading-normal">
          If your ideal time isn&apos;t listed above, share your preference with us.
        </p>

        {/* Real-time backend status feedback */}
        {status === 'CHECKING' && (
          <div
            className="mt-1.5 flex items-center gap-1.5 text-[11px] text-amber-700 bg-amber-50/80 px-2.5 py-1.5 rounded-lg border border-amber-200/60 anim-fade-up"
            data-testid="preferred-status-checking"
          >
            <Loader2 className="w-3.5 h-3.5 text-amber-600 animate-spin shrink-0" />
            <span>Checking mentor availability for {preferredTime}...</span>
          </div>
        )}

        {status === 'AVAILABLE' && preferredTime && !isOpen && (
          <div
            className="mt-1.5 flex items-center gap-1.5 text-[11px] text-emerald-800 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200/80 anim-fade-up"
            data-testid="preferred-status-available"
          >
            <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5] shrink-0" />
            <span>
              <strong>{preferredTime}</strong> is available! An eligible mentor is matched.
            </span>
          </div>
        )}

        {status === 'UNAVAILABLE' && preferredTime && !isOpen && (
          <div
            className="mt-1.5 flex items-center gap-1.5 text-[11px] text-amber-900 bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-300/80 anim-fade-up"
            data-testid="preferred-status-unavailable"
          >
            <span>
              {statusMessage ||
                `No mentors are available at ${preferredTime}. Please choose an available slot above.`}
            </span>
          </div>
        )}

        {/* Subtle Dropdown / Popover Time Picker */}
        {isOpen && (
          <div
            role="dialog"
            aria-label="Select preferred time"
            className="w-full mt-1.5 bg-white border border-[#CBD5E1] rounded-xl p-3.5 shadow-card z-30 relative sm:absolute sm:left-0 sm:right-0 popover-enter"
            data-testid="preferred-time-popover"
          >
            <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-100">
              <span className="text-xs font-semibold text-slate-700">Set preferred time</span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">15-min grain</span>
            </div>

            {/* 3-Column Time Picker: Hour, Minute, AM/PM */}
            <div className="grid grid-cols-3 gap-2 items-center">
              {/* Hour Selection */}
              <div>
                <label
                  htmlFor="pref-hour-select"
                  className="text-[11px] font-medium text-slate-500 mb-1 block"
                >
                  Hour
                </label>
                <select
                  id="pref-hour-select"
                  data-testid="pref-hour-select"
                  value={selectedHour}
                  onChange={(e) => setSelectedHour(e.target.value)}
                  className="w-full h-9 px-2 rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#D98B0F] focus:ring-1 focus:ring-[#F5A623] cursor-pointer"
                >
                  {HOURS.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              {/* Minute Selection (15-min intervals) */}
              <div>
                <label
                  htmlFor="pref-minute-select"
                  className="text-[11px] font-medium text-slate-500 mb-1 block"
                >
                  Minute
                </label>
                <select
                  id="pref-minute-select"
                  data-testid="pref-minute-select"
                  value={selectedMinute}
                  onChange={(e) => setSelectedMinute(e.target.value)}
                  className="w-full h-9 px-2 rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#D98B0F] focus:ring-1 focus:ring-[#F5A623] cursor-pointer"
                >
                  {MINUTES.map((m) => (
                    <option key={m} value={m}>
                      :{m}
                    </option>
                  ))}
                </select>
              </div>

              {/* AM / PM Toggle */}
              <div>
                <label className="text-[11px] font-medium text-slate-500 mb-1 block select-none">
                  Period
                </label>
                <div className="h-9 p-0.5 rounded-lg border border-[#CBD5E1] bg-slate-100 flex items-center">
                  <button
                    type="button"
                    data-testid="period-am-btn"
                    onClick={() => setSelectedPeriod("AM")}
                    className={`flex-1 h-full rounded-md text-xs font-bold transition-all cursor-pointer ${
                      selectedPeriod === "AM"
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    AM
                  </button>
                  <button
                    type="button"
                    data-testid="period-pm-btn"
                    onClick={() => setSelectedPeriod("PM")}
                    className={`flex-1 h-full rounded-md text-xs font-bold transition-all cursor-pointer ${
                      selectedPeriod === "PM"
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    PM
                  </button>
                </div>
              </div>
            </div>

            {/* Popover Actions */}
            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
              <button
                type="button"
                data-testid="cancel-preferred-time"
                onClick={() => setIsOpen(false)}
                className="text-xs font-medium text-slate-500 hover:text-slate-800 py-1 px-2 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <div className="flex items-center gap-1.5">
                {preferredTime && (
                  <button
                    type="button"
                    data-testid="clear-popover-btn"
                    onClick={handleClear}
                    className="text-xs font-medium text-red-600 hover:text-red-700 py-1 px-2 transition-colors cursor-pointer"
                  >
                    Reset
                  </button>
                )}
                <button
                  type="button"
                  data-testid="apply-preferred-time"
                  onClick={handleApplyCustomTime}
                  className="h-8 px-3 rounded-lg bg-[#F5A623] hover:bg-[#E89918] active:bg-[#D98B0F] text-slate-950 text-xs font-bold inline-flex items-center gap-1 transition-all cursor-pointer shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F5A623]/40"
                >
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Set time</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
