"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Globe, User } from "lucide-react";
import { TimezoneOption } from "@/types/booking.types";

interface NavbarProps {
  timezone: TimezoneOption;
  onOpenTimezoneModal?: () => void;
  onLogoClick?: () => void;
}

export function Navbar({ timezone, onOpenTimezoneModal, onLogoClick }: NavbarProps) {
  return (
    <header className="fixed top-0 left-0 right-0 w-full z-50 bg-[#DFE4EA]/90 backdrop-blur-md border-b border-[#CBD5E1]/80 transition-colors">
      <div className="h-16 max-w-7xl mx-auto px-4 lg:px-8 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center">
          <button
            type="button"
            onClick={onLogoClick}
            aria-label="Codeyoung Home"
            className="flex items-center cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F5A623]/40 rounded-lg py-1"
          >
            <Image
              src="/primary_logo.png"
              alt="Codeyoung"
              width={180}
              height={56}
              priority
              className="h-10 sm:h-11 w-auto object-contain transition-transform duration-200 hover:scale-[1.03] active:scale-[0.98]"
            />
          </button>
        </div>

        {/* Header Right Controls */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Auto-detected timezone indicator & selector trigger */}
          {onOpenTimezoneModal ? (
            <button
              type="button"
              onClick={onOpenTimezoneModal}
              aria-label={`Current timezone: ${timezone.label} (Auto-detected). Click to change timezone.`}
              className="flex items-center gap-1.5 text-slate-700 bg-white/95 px-3 py-1.5 rounded-lg border border-[#CBD5E1] shadow-control text-xs font-semibold select-none transition-all hover:shadow-control-hover hover:border-[#D98B0F] cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="text-xs sm:text-sm font-semibold text-slate-900">{timezone.label}</span>
              <span className="text-xs text-[#00A86B] font-semibold hidden sm:inline">· Auto-detected</span>
            </button>
          ) : (
            <div
              aria-label={`Current timezone: ${timezone.label} (Auto-detected)`}
              className="flex items-center gap-1.5 text-slate-700 bg-white/95 px-3 py-1.5 rounded-lg border border-[#CBD5E1] shadow-control text-xs font-semibold select-none transition-shadow hover:shadow-control-hover"
            >
              <Globe className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="text-xs sm:text-sm font-semibold text-slate-900">{timezone.label}</span>
              <span className="text-xs text-[#00A86B] font-semibold hidden sm:inline">· Auto-detected</span>
            </div>
          )}

          {/* Internal Dashboard Link */}
          <Link
            href="/dashboard"
            className="hidden sm:inline-flex items-center px-2.5 py-1.5 rounded-lg bg-white/95 hover:bg-white text-slate-700 text-xs font-semibold border border-[#CBD5E1] shadow-control hover:shadow-control-hover transition-all duration-150"
            title="Switch to Internal Verification Dashboard"
          >
            Dashboard
          </Link>

          {/* User profile avatar */}
          <div
            className="w-8 h-8 rounded-full bg-[#0F172A] text-white flex items-center justify-center shrink-0 border border-[#CBD5E1] shadow-control select-none transition-transform duration-150 hover:scale-105 active:scale-95 cursor-pointer"
            aria-label="User account"
          >
            <User className="w-4 h-4 text-white" />
          </div>
        </div>
      </div>
    </header>
  );
}
