"use client";

import React, { useState, useEffect, useId } from "react";
import { X, Search, Globe, Check, MapPin } from "lucide-react";
import { TimezoneOption } from "@/types/booking.types";
import { POPULAR_TIMEZONES } from "@/constants/timezones.constants";
import { detectBrowserTimezone } from "@/lib/timezone-utils";

interface TimezoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTimezone: TimezoneOption;
  onSelectTimezone: (tz: TimezoneOption) => void;
}

export function TimezoneModal({
  isOpen,
  onClose,
  selectedTimezone,
  onSelectTimezone,
}: TimezoneModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const titleId = useId();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filtered = POPULAR_TIMEZONES.filter(
    (tz) =>
      tz.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tz.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tz.region.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tz.iana.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAutoDetect = () => {
    const clientTz = detectBrowserTimezone();
    onSelectTimezone(clientTz);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/45 backdrop-blur-xs transition-opacity"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-[#CBD5E1] overflow-hidden flex flex-col max-h-[85vh] modal-enter"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-[#D98B0F]" />
            <h2 id={titleId} className="text-base font-bold text-slate-900">
              Select Your Timezone
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search & Auto-detect bar */}
        <div className="p-4 border-b border-[#CBD5E1]/80 space-y-3 bg-[#F8FAFC]">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by city or country (e.g. London, New York)..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-[#CBD5E1] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F5A623]/25 focus:border-[#D98B0F] text-slate-900 placeholder:text-slate-400 shadow-control transition-all"
              autoFocus
            />
          </div>

          <button
            type="button"
            onClick={handleAutoDetect}
            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-[#CBD5E1] bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-all shadow-control cursor-pointer"
          >
            <MapPin className="w-3.5 h-3.5 text-[#D98B0F]" />
            <span>Auto-detect my current timezone</span>
          </button>
        </div>

        {/* Timezone List */}
        <div className="overflow-y-auto p-2 divide-y divide-slate-100 flex-1">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No matching timezone found. Try another city name.
            </div>
          ) : (
            filtered.map((tz) => {
              const isSelected = tz.iana === selectedTimezone.iana;
              return (
                <button
                  key={tz.iana}
                  type="button"
                  onClick={() => {
                    onSelectTimezone(tz);
                    onClose();
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-amber-50/80 border-l-2 border-[#D98B0F] text-slate-900 font-semibold"
                      : "hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{tz.label}</p>
                    <p className="text-xs text-slate-500">
                      {tz.region} · {tz.utcOffset}
                    </p>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-[#D98B0F] shrink-0" />}
                </button>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="px-5 py-3 bg-[#F8FAFC] border-t border-slate-100 text-[11px] text-slate-500 text-center">
          All appointment times and calendar invites will automatically adjust to this timezone.
        </div>
      </div>
    </div>
  );
}
