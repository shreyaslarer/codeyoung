"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { LayoutGrid, Users, Calendar, ArrowLeft, X, LogOut, Terminal, Activity, ShieldCheck } from "lucide-react";
import { DashboardNavTab } from "@/types/dashboard.types";

interface DashboardSidebarProps {
  activeTab: DashboardNavTab;
  onSelectTab: (tab: DashboardNavTab) => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export function DashboardSidebar({
  activeTab,
  onSelectTab,
  isOpenMobile = false,
  onCloseMobile,
}: DashboardSidebarProps) {
  const navItems: Array<{
    id: DashboardNavTab;
    label: string;
    sublabel: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: "overview", label: "Overview", sublabel: "Live metrics & allocation", icon: LayoutGrid },
    { id: "mentors", label: "Mentor Fleet", sublabel: "10 mentors · 2 cap/day", icon: Users },
    { id: "bookings", label: "Booking Registry", sublabel: "Confirmed audit trail", icon: Calendar },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-xs lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed left-0 top-0 h-full w-64 bg-white/95 backdrop-blur-xl z-50 flex flex-col justify-between py-4 border-r border-[#CBD5E1] transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpenMobile ? "translate-x-0 shadow-2xl" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Top Area: Logo + Nav */}
        <div className="flex flex-col">
          {/* Logo & Category Eyebrow */}
          <div className="px-5 pb-4 border-b border-[#CBD5E1]/70 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Image
                  src="/primary_logo.png"
                  alt="Codeyoung"
                  width={130}
                  height={40}
                  className="h-7 w-auto object-contain"
                />
              </div>
              <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#F8FAFC] border border-[#CBD5E1] text-[#784E00] text-[10px] font-mono font-bold tracking-wider uppercase">
                <Terminal className="w-3 h-3 text-[#D98B0F]" />
                <span>Verification Cockpit</span>
              </div>
            </div>

            {/* Mobile close button */}
            {onCloseMobile && (
              <button
                type="button"
                onClick={onCloseMobile}
                className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                aria-label="Close sidebar"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="px-3 flex flex-col gap-1.5 mt-4" aria-label="Dashboard Navigation">
            <span className="text-[10px] font-bold font-mono tracking-wider text-slate-400 uppercase px-3 mb-1">
              NAVIGATION
            </span>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onSelectTab(item.id);
                    if (onCloseMobile) onCloseMobile();
                  }}
                  className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs transition-all text-left font-medium cursor-pointer ${
                    isActive
                      ? "bg-[#F5A623] text-slate-950 font-bold shadow-xs border border-[#D98B0F]"
                      : "text-slate-600 hover:bg-[#F8FAFC] hover:text-slate-900 border border-transparent"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-105 ${
                      isActive ? "text-slate-950" : "text-slate-500"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold leading-snug">{item.label}</div>
                    <div
                      className={`text-[10px] truncate ${
                        isActive ? "text-slate-950/70" : "text-slate-400"
                      }`}
                    >
                      {item.sublabel}
                    </div>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom System & Host Status */}
        <div className="px-4 pt-3 flex flex-col gap-2.5 bg-white/90 border-t border-[#CBD5E1]/70">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-950 py-1 transition-colors group"
            >
              <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
              <span>Parent Booking</span>
            </Link>

            <button
              type="button"
              onClick={async () => {
                try {
                  await fetch("/api/admin/logout", { method: "POST" });
                } catch {
                  // Ignore network error on logout
                }
                if (typeof window !== "undefined") {
                  localStorage.removeItem("codeyoung_admin_session");
                  window.location.href = "/admin";
                }
              }}
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
              title="Sign out of portal"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign out</span>
            </button>
          </div>

          {/* System Health Strip */}
          <div className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#CBD5E1] flex items-center justify-between text-[11px] text-slate-600">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#00A86B] animate-pulse" />
              <span className="font-mono font-semibold text-slate-800">Cluster 01</span>
            </div>
            <span className="text-[10px] font-mono text-[#00A86B] font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
              NOMINAL
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}
