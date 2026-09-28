"use client";

import React from "react";
import { Globe, RotateCw, User, Menu, ArrowLeft, Terminal, Database } from "lucide-react";
import Link from "next/link";

interface DashboardHeaderProps {
  onRefresh: () => void;
  isRefreshing?: boolean;
  onOpenMobileMenu?: () => void;
}

export function DashboardHeader({
  onRefresh,
  isRefreshing = false,
  onOpenMobileMenu,
}: DashboardHeaderProps) {
  return (
    <header className="fixed top-0 left-0 lg:left-64 right-0 h-16 bg-[#DFE4EA]/90 backdrop-blur-md z-40 flex items-center justify-between px-4 lg:px-6 border-b border-[#CBD5E1] transition-colors">
      {/* Left: Mobile Menu Trigger + Title / Eyebrow */}
      <div className="flex items-center gap-3">
        {onOpenMobileMenu && (
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="lg:hidden p-1.5 rounded-lg text-slate-700 hover:text-slate-950 hover:bg-white/80 border border-[#CBD5E1] shadow-control transition-all"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold font-mono tracking-wider text-[#D98B0F] uppercase px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
              ENG // VERIFICATION
            </span>
            <span className="text-[11px] text-slate-500 font-mono hidden md:inline">
              v2.4.0-prod
            </span>
          </div>
          <h1 className="text-sm sm:text-base font-bold text-[#0F172A] tracking-tight leading-tight mt-0.5">
            Scheduling Engine Cockpit
          </h1>
        </div>
      </div>

      {/* Right Controls Area: Telemetry & Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Host Timezone Badge */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/95 text-slate-800 text-xs font-semibold border border-[#CBD5E1] shadow-control">
          <Globe className="w-3.5 h-3.5 text-[#D98B0F]" />
          <span>Asia/Kolkata (IST · UTC+5:30)</span>
        </div>

        {/* Database Status Pill */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/95 text-slate-800 text-xs font-semibold border border-[#CBD5E1] shadow-control">
          <Database className="w-3.5 h-3.5 text-[#00A86B]" />
          <span className="h-1.5 w-1.5 rounded-full bg-[#00A86B] animate-pulse" />
          <span className="font-mono text-[11px] text-slate-700">MongoDB Live</span>
        </div>

        {/* Refresh Action Button */}
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/95 hover:bg-white active:bg-slate-100 text-slate-800 text-xs font-semibold border border-[#CBD5E1] shadow-control transition-all cursor-pointer disabled:opacity-50 active:scale-95"
          title="Sync real-time MongoDB data"
        >
          <RotateCw className={`w-3.5 h-3.5 text-slate-600 ${isRefreshing ? "animate-spin text-[#D98B0F]" : ""}`} />
          <span className="hidden sm:inline">{isRefreshing ? "Syncing..." : "Sync data"}</span>
        </button>

        {/* Parent Booking View Link */}
        <Link
          href="/"
          className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/95 hover:bg-white text-slate-700 text-xs font-semibold border border-[#CBD5E1] shadow-control transition-all"
        >
          <ArrowLeft className="w-3 h-3" />
          <span>Booking Flow</span>
        </Link>

        {/* Profile Avatar */}
        <div
          className="w-8 h-8 rounded-full bg-[#0F172A] text-white flex items-center justify-center shadow-control select-none border border-[#CBD5E1] transition-transform hover:scale-105"
          aria-label="Eng admin profile"
          title="Engineering Admin"
        >
          <User className="w-4 h-4 text-white" />
        </div>
      </div>
    </header>
  );
}
