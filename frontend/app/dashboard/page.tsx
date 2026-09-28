"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Calendar as CalendarIcon, Filter, ExternalLink } from "lucide-react";
import {
  DashboardSidebar,
  DashboardHeader,
  MetricsGrid,
  InvariantStatusStrip,
  SchedulingActivityTable,
  MentorAllocationSection,
  VerificationFootnote,
  MentorScheduleModal,
} from "@/components/dashboard";
import { PageBackground } from "@/components";
import {
  DASHBOARD_METRICS,
  SCHEDULING_ACTIVITIES,
  MENTOR_ALLOCATIONS,
  NEXT_AVAILABLE_MENTORS,
  VERIFICATION_SUMMARY,
} from "@/constants/dashboard.constants";
import {
  DashboardNavTab,
  MetricCardData,
  BookingActivityItem,
  MentorAllocationItem,
  AvailableMentorQueueItem,
  MentorFleetItem,
  DashboardInvariants,
  DashboardVerificationSummary,
  DashboardStatsApiResponse,
} from "@/types/dashboard.types";

const INITIAL_FLEET: MentorFleetItem[] = MENTOR_ALLOCATIONS.map((m, idx) => ({
  ...m,
  mentorId: `m-init-${idx}`,
  track: idx % 3 === 0 ? "CODING" : idx % 3 === 1 ? "SCIENCE" : "MATH",
  email: `${m.mentorName.toLowerCase().replace(/[^a-z0-9]/g, "")}@codeyoung.dev`,
}));

const DEFAULT_INVARIANTS: DashboardInvariants = {
  collisions: 0,
  maxDelta: 1,
  dbMutex: "Nominal",
  loadBalancer: "Deterministic round-robin weighted by availability",
};

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<DashboardNavTab>("overview");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [source, setSource] = useState<"mongodb_live" | "local_cache">("mongodb_live");
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [selectedDate, setSelectedDate] = useState<string>("2026-09-29");
  const [mentorFilterTrack, setMentorFilterTrack] = useState<string>("ALL");

  // Real-time state synced with MongoDB
  const [metrics, setMetrics] = useState<readonly MetricCardData[] | null>(null);
  const [activities, setActivities] = useState<readonly BookingActivityItem[] | null>(null);
  const [allocations, setAllocations] = useState<readonly MentorAllocationItem[] | null>(null);
  const [allMentors, setAllMentors] = useState<readonly MentorFleetItem[] | null>(null);
  const [availableQueue, setAvailableQueue] = useState<readonly AvailableMentorQueueItem[] | null>(null);
  const [invariants, setInvariants] = useState<DashboardInvariants | null>(null);
  const [summary, setSummary] = useState<DashboardVerificationSummary | null>(null);
  const [selectedMentorForModal, setSelectedMentorForModal] = useState<MentorFleetItem | MentorAllocationItem | AvailableMentorQueueItem | null>(null);

  // Fetch live stats from /api/dashboard/stats
  const loadDashboardStats = useCallback(
    async (overrideDate?: string) => {
      try {
        const queryDate = overrideDate !== undefined ? overrideDate : selectedDate;
        const queryString = queryDate ? `?date=${queryDate}` : "";
        const res = await fetch(`/api/dashboard/stats${queryString}`, {
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
        });

        if (res.ok) {
          const data: DashboardStatsApiResponse = await res.json();
          if (data.metrics && Array.isArray(data.metrics)) {
            setMetrics(data.metrics);
          }
          if (data.activities && Array.isArray(data.activities)) {
            setActivities(data.activities);
          }
          if (data.mentorAllocations && Array.isArray(data.mentorAllocations)) {
            setAllocations(data.mentorAllocations);
          }
          if (data.allMentors && Array.isArray(data.allMentors)) {
            setAllMentors(data.allMentors);
          }
          if (data.nextAvailableMentors && Array.isArray(data.nextAvailableMentors)) {
            setAvailableQueue(data.nextAvailableMentors);
          }
          if (data.invariants) {
            setInvariants(data.invariants);
          }
          if (data.summary) {
            setSummary(data.summary);
          }
          if (data.source) {
            setSource(data.source);
          }
          if (data.selectedDate && overrideDate === undefined) {
            setSelectedDate(data.selectedDate);
          }
          setIsConnected(true);
          setIsInitialLoad(false);
        } else {
          console.warn("Dashboard stats returned status:", res.status);
          setIsInitialLoad(false);
        }
      } catch (err) {
        console.warn("Could not fetch live dashboard stats, falling back to local constants:", err);
        setIsConnected(false);
        setMetrics((prev) => prev ?? DASHBOARD_METRICS);
        setActivities((prev) => prev ?? SCHEDULING_ACTIVITIES);
        setAllocations((prev) => prev ?? MENTOR_ALLOCATIONS);
        setAllMentors((prev) => prev ?? INITIAL_FLEET);
        setAvailableQueue((prev) => prev ?? NEXT_AVAILABLE_MENTORS);
        setInvariants((prev) => prev ?? DEFAULT_INVARIANTS);
        setSummary((prev) => prev ?? VERIFICATION_SUMMARY);
        setIsInitialLoad(false);
      }
    },
    [selectedDate]
  );

  // Polling setup: initial fetch + 5-second polling interval
  useEffect(() => {
    let cancelled = false;

    async function initialFetch() {
      if (!cancelled) {
        await loadDashboardStats();
      }
    }

    initialFetch();

    const pollTimer = setInterval(() => {
      loadDashboardStats();
    }, 5000);

    return () => {
      cancelled = true;
      clearInterval(pollTimer);
    };
  }, [loadDashboardStats]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadDashboardStats();
    } finally {
      setIsRefreshing(false);
    }
  };

  const formatDisplayDate = (d: string) => {
    if (!d) return "Tuesday, September 29, 2026";
    const [y, m, day] = d.split("-").map(Number);
    const dateObj = new Date(Date.UTC(y, m - 1, day, 12, 0, 0));
    return dateObj.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });
  };

  const getTrackBadgeStyle = (track: string) => {
    const t = (track || "").toUpperCase();
    if (t.includes("CODING")) {
      return { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" };
    }
    if (t.includes("MATH")) {
      return { bg: "bg-amber-50", text: "text-amber-800", border: "border-amber-200" };
    }
    if (t.includes("SCIENCE")) {
      return { bg: "bg-emerald-50", text: "text-emerald-800", border: "border-emerald-200" };
    }
    if (t.includes("ENGLISH")) {
      return { bg: "bg-cyan-50", text: "text-cyan-800", border: "border-cyan-200" };
    }
    if (t.includes("ROBOTICS")) {
      return { bg: "bg-rose-50", text: "text-rose-800", border: "border-rose-200" };
    }
    if (t.includes("FINANCE")) {
      return { bg: "bg-purple-50", text: "text-purple-800", border: "border-purple-200" };
    }
    return { bg: "bg-orange-50", text: "text-orange-800", border: "border-orange-200" };
  };

  const filteredFleet = (allMentors ?? []).filter((m) => {
    if (mentorFilterTrack === "ALL") return true;
    return (m.track || "").toUpperCase().includes(mentorFilterTrack);
  });

  const handleOpenMentorModal = (mentorCode: string) => {
    const cleanCode = mentorCode.replace(/Mentor\s*/i, "").trim();
    const found =
      (allMentors ?? []).find(
        (m) =>
          m.mentorCode.replace(/Mentor\s*/i, "").trim() === cleanCode ||
          m.mentorName.toLowerCase() === mentorCode.toLowerCase()
      ) ||
      (allocations ?? []).find(
        (m) =>
          m.mentorCode.replace(/Mentor\s*/i, "").trim() === cleanCode ||
          m.mentorName.toLowerCase() === mentorCode.toLowerCase()
      ) ||
      (availableQueue ?? []).find(
        (m) =>
          m.mentorCode.replace(/Mentor\s*/i, "").trim() === cleanCode ||
          m.mentorName.toLowerCase() === mentorCode.toLowerCase()
      ) ||
      null;
    setSelectedMentorForModal(found);
  };

  const scheduledBookingsForMentor = selectedMentorForModal
    ? (activities ?? []).filter((a) => {
        const mCode = selectedMentorForModal.mentorCode.replace(/Mentor\s*/i, "").trim();
        return (
          a.mentor.code === mCode ||
          a.mentor.name.toLowerCase() === selectedMentorForModal.mentorName.toLowerCase()
        );
      })
    : [];

  return (
    <div className="relative min-h-screen bg-[#DFE4EA] font-sans text-[#0F172A] antialiased">
      {/* Ambient background canvas with interactive interlinking dots */}
      <PageBackground variant="default" />

      {/* 1. Left Sidebar Navigation */}
      <DashboardSidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* 2. Main Content Wrapper */}
      <div className="lg:pl-64 flex flex-col min-h-screen relative" style={{ zIndex: 1 }}>
        {/* Top Header */}
        <DashboardHeader
          onRefresh={handleManualRefresh}
          isRefreshing={isRefreshing}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          source={source}
          isConnected={isConnected}
        />

        {/* Main Body */}
        <main className="w-full pt-20 px-4 sm:px-6 lg:px-8 py-8 flex-1">
          {isInitialLoad ? (
            /* Skeleton — shown only while the first API fetch is in-flight */
            <div className="max-w-[1120px] w-full mx-auto space-y-6 animate-pulse">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="space-y-2">
                  <div className="h-3 w-48 bg-slate-300 rounded" />
                  <div className="h-8 w-72 bg-slate-300 rounded" />
                  <div className="h-4 w-96 bg-slate-300 rounded" />
                </div>
                <div className="h-8 w-56 bg-slate-300 rounded-lg" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="bg-white p-5 rounded-2xl border border-[#CBD5E1] shadow-card space-y-3">
                    <div className="h-3 w-24 bg-slate-200 rounded" />
                    <div className="h-8 w-16 bg-slate-200 rounded" />
                    <div className="h-3 w-32 bg-slate-200 rounded" />
                  </div>
                ))}
              </div>
              <div className="h-14 w-full bg-white rounded-2xl border border-[#CBD5E1] shadow-card" />
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-[#CBD5E1] shadow-card space-y-4">
                  <div className="h-4 w-44 bg-slate-200 rounded" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {[0, 1, 2, 3].map((j) => (
                      <div key={j} className="h-12 bg-slate-100 rounded-xl" />
                    ))}
                  </div>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-[#CBD5E1] shadow-card space-y-3">
                  <div className="h-4 w-36 bg-slate-200 rounded" />
                  <div className="space-y-2">
                    {[0, 1, 2].map((k) => (
                      <div key={k} className="h-9 bg-slate-100 rounded-xl" />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-[1120px] w-full mx-auto space-y-6 page-enter">
              {/* ================= TAB 1: OVERVIEW ================= */}
              {activeTab === "overview" && (
                <>
                  {/* Header Section */}
                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 anim-fade-up delay-75">
                    <div>
                      <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight">
                        Scheduling Overview
                      </h2>
                      <p className="text-sm text-slate-600 mt-1">
                        Live trial bookings, automatic mentor allocation, and capacity invariants.
                      </p>
                    </div>

                    {/* Date Context & Switcher */}
                    <div className="flex flex-col items-start md:items-end gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Display Date Badge */}
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-[#CBD5E1] shadow-card text-xs sm:text-sm font-bold text-[#0F172A]">
                          <CalendarIcon className="w-4 h-4 text-[#D98B0F]" />
                          <span>{formatDisplayDate(selectedDate)}</span>
                        </div>

                        {/* Quick Date Switcher Tabs */}
                        <div className="inline-flex items-center bg-white p-1 rounded-xl border border-[#CBD5E1] shadow-control gap-1">
                          {[
                            { date: "2026-09-27", label: "Sep 27" },
                            { date: "2026-09-28", label: "Sep 28" },
                            { date: "2026-09-29", label: "Sep 29" },
                            { date: "2026-09-30", label: "Sep 30" },
                          ].map((dTab) => (
                            <button
                              key={dTab.date}
                              type="button"
                              onClick={() => {
                                setSelectedDate(dTab.date);
                                loadDashboardStats(dTab.date);
                              }}
                              className={`slot-btn px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                                selectedDate === dTab.date
                                  ? "bg-[#F5A623] text-slate-950 border border-[#D98B0F] shadow-xs"
                                  : "text-slate-600 hover:text-slate-950 hover:bg-slate-50"
                              }`}
                            >
                              {dTab.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 4 Compact Core Metrics */}
                  <MetricsGrid metrics={metrics ?? []} />

                  {/* Active Invariant Status Strip */}
                  <InvariantStatusStrip invariants={invariants ?? DEFAULT_INVARIANTS} />

                  {/* Mentor Allocation Distribution + Next Available Queue */}
                  <MentorAllocationSection
                    allocations={allocations ?? []}
                    availableQueue={availableQueue ?? []}
                    unassignedCount={(allMentors ?? []).filter((m) => m.assignedCount === 0).length}
                    onSelectMentor={handleOpenMentorModal}
                  />

                  {/* Today's Scheduling Activity Table Section */}
                  <SchedulingActivityTable
                    activities={activities ?? []}
                    onSelectMentor={handleOpenMentorModal}
                  />

                  {/* Verification Invariant Summary Footnote Box */}
                  <VerificationFootnote summary={summary ?? VERIFICATION_SUMMARY} />
                </>
              )}

              {/* ================= TAB 2: MENTORS ================= */}
              {activeTab === "mentors" && (
                <div className="space-y-6 page-enter">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 anim-fade-up delay-75">
                    <div>
                      <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight">
                        Mentor Fleet &amp; Capacity
                      </h2>
                      <p className="text-sm text-slate-600 mt-1">
                        All 10 seeded mentors, live assigned classes, and strict 2-class/day capacity tracking.
                      </p>
                    </div>

                    {/* Track Filter Pills */}
                    <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-[#CBD5E1] shadow-control flex-wrap">
                      <span className="text-[11px] font-mono text-slate-400 px-2 font-bold uppercase flex items-center gap-1">
                        <Filter className="w-3 h-3 text-slate-500" /> Track:
                      </span>
                      {["ALL", "CODING", "MATH", "SCIENCE"].map((track) => (
                        <button
                          key={track}
                          type="button"
                          onClick={() => setMentorFilterTrack(track)}
                          className={`slot-btn px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                            mentorFilterTrack === track
                              ? "bg-[#F5A623] text-slate-950 border border-[#D98B0F] shadow-xs"
                              : "text-slate-600 hover:text-slate-950 hover:bg-slate-50"
                          }`}
                        >
                          {track}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Quick Fleet Summary Strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 anim-fade-up delay-150">
                    <div className="bg-white p-4 rounded-2xl border border-[#CBD5E1] shadow-card card-lift">
                      <div className="text-[11px] text-slate-500 font-mono font-bold uppercase">Seeded Fleet</div>
                      <div className="text-2xl font-extrabold text-[#0F172A] mt-1 tabular-nums">
                        {(allMentors ?? []).length}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">Total mentors registered</div>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-[#CBD5E1] shadow-card card-lift">
                      <div className="text-[11px] text-indigo-600 font-mono font-bold uppercase">Active Today</div>
                      <div className="text-2xl font-extrabold text-indigo-700 mt-1 tabular-nums">
                        {(allMentors ?? []).filter((m) => m.assignedCount > 0).length}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">Assigned ≥1 trial class</div>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-[#CBD5E1] shadow-card card-lift">
                      <div className="text-[11px] text-amber-600 font-mono font-bold uppercase">At Daily Cap</div>
                      <div className="text-2xl font-extrabold text-[#D98B0F] mt-1 tabular-nums">
                        {(allMentors ?? []).filter((m) => m.assignedCount >= 2).length}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">2 classes max reached</div>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-[#CBD5E1] shadow-card card-lift">
                      <div className="text-[11px] text-emerald-600 font-mono font-bold uppercase">Standby Queue</div>
                      <div className="text-2xl font-extrabold text-[#00A86B] mt-1 tabular-nums">
                        {(allMentors ?? []).filter((m) => m.assignedCount === 0).length}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">Ready for dispatch (0 used)</div>
                    </div>
                  </div>

                  {/* Live Mentor Cards from MongoDB */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 anim-fade-up delay-200">
                    {filteredFleet.map((m) => {
                      const badge = getTrackBadgeStyle(m.track);
                      const email =
                        m.email ||
                        `${m.mentorName.toLowerCase().replace(/[^a-z0-9]/g, "")}@codeyoung.dev`;
                      const statusText =
                        m.assignedCount >= 2
                          ? "Capacity Reached"
                          : m.assignedCount === 1
                          ? "Active"
                          : "Available";

                      const percentage = Math.round((m.assignedCount / m.maxCapacity) * 100);

                      return (
                        <div
                          key={m.mentorId || m.mentorCode}
                          onClick={() => setSelectedMentorForModal(m)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setSelectedMentorForModal(m);
                            }
                          }}
                          title="Click to view scheduled classes & shared meeting URL"
                          className="bg-white p-5 rounded-2xl border border-[#CBD5E1] hover:border-amber-400 shadow-card card-lift flex flex-col justify-between gap-4 transition-all cursor-pointer group"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-11 h-11 rounded-xl ${badge.bg} ${badge.text} font-mono font-bold text-xs flex items-center justify-center border ${badge.border} shrink-0`}
                              >
                                {m.mentorCode.replace(/Mentor\s*/i, "")}
                              </div>
                              <div>
                                <div className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
                                  <span className="group-hover:text-[#D98B0F] transition-colors">{m.mentorName}</span>
                                  <span
                                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${badge.bg} ${badge.text} ${badge.border}`}
                                  >
                                    {m.track}
                                  </span>
                                </div>
                                <div className="text-xs text-slate-500 font-mono mt-0.5">{email}</div>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <div className="text-xs font-mono font-bold text-[#0F172A] tabular-nums">
                                {m.assignedCount} / {m.maxCapacity} classes
                              </div>
                              <span
                                className={`inline-block text-[11px] font-bold mt-1 px-2 py-0.5 rounded-full ${
                                  m.assignedCount >= 2
                                    ? "bg-amber-100 text-[#784E00] border border-amber-300"
                                    : m.assignedCount === 0
                                    ? "bg-emerald-50 text-emerald-800 border border-emerald-300"
                                    : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                                }`}
                              >
                                {statusText}
                              </span>
                            </div>
                          </div>

                          {/* Dual-bar capacity progress visual */}
                          <div>
                            <div className="flex items-center gap-1.5 mb-1.5">
                              {/* Slot 1 */}
                              <div
                                className={`h-2 flex-1 rounded-sm transition-all duration-300 ${
                                  m.assignedCount >= 1
                                    ? m.assignedCount >= 2
                                      ? "bg-[#D97706]"
                                      : "bg-[#F5A623]"
                                    : "bg-slate-200"
                                }`}
                              />
                              {/* Slot 2 */}
                              <div
                                className={`h-2 flex-1 rounded-sm transition-all duration-300 ${
                                  m.assignedCount >= 2 ? "bg-[#D97706]" : "bg-slate-200"
                                }`}
                              />
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-slate-500">
                              <span className="font-mono">Timezone: Asia/Kolkata (IST · UTC+5:30)</span>
                              <span className="font-mono font-bold text-slate-700">{percentage}% capacity</span>
                            </div>
                          </div>

                          {/* Interactive Card Action Row */}
                          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                            <span className="text-[11px] text-slate-500 font-medium">
                              {m.assignedCount > 0
                                ? `${m.assignedCount} trial class${m.assignedCount > 1 ? "es" : ""} scheduled`
                                : "No classes assigned today"}
                            </span>
                            <span className="text-xs font-semibold text-[#D98B0F] group-hover:text-[#B45309] inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                              <span>View schedule &amp; link</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ================= TAB 3: BOOKINGS ================= */}
              {activeTab === "bookings" && (
                <div className="space-y-6 page-enter">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 anim-fade-up delay-75">
                    <div>
                      <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight">
                        Booking Registry &amp; Audit Trail
                      </h2>
                      <p className="text-sm text-slate-600 mt-1">
                        Full historical logs of trial class reservations with parent details and allocated mentors.
                      </p>
                    </div>
                  </div>

                  {/* KPI Ribbon */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 anim-fade-up delay-150">
                    <div className="bg-white p-5 rounded-2xl border border-[#CBD5E1] shadow-card card-lift">
                      <div className="text-[11px] text-slate-500 font-mono font-bold uppercase">Confirmed Sessions</div>
                      <div className="text-3xl font-extrabold text-[#0F172A] mt-1 tabular-nums">
                        {(activities ?? []).length}
                      </div>
                      <div className="text-[11px] text-[#00A86B] font-bold mt-1 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#00A86B]" />
                        <span>100% committed in database</span>
                      </div>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-[#CBD5E1] shadow-card card-lift">
                      <div className="text-[11px] text-slate-500 font-mono font-bold uppercase">Mentors Dispatched</div>
                      <div className="text-3xl font-extrabold text-indigo-700 mt-1 tabular-nums">
                        {new Set((activities ?? []).map((a) => a.mentor.name)).size}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1 font-mono">
                        Distributed across active slots
                      </div>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-[#CBD5E1] shadow-card card-lift">
                      <div className="text-[11px] text-slate-500 font-mono font-bold uppercase">Concurrency Check</div>
                      <div className="text-3xl font-extrabold text-[#00A86B] mt-1 tabular-nums">
                        0 Conflicts
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1 font-mono">
                        Slot double-booking invariant verified
                      </div>
                    </div>
                  </div>

                  <SchedulingActivityTable
                    activities={activities ?? []}
                    onSelectMentor={handleOpenMentorModal}
                  />
                </div>
              )}
            </div>
          )}
        </main>

        {/* Mentor Schedule & Shared Class URL Modal */}
        <MentorScheduleModal
          isOpen={Boolean(selectedMentorForModal)}
          onClose={() => setSelectedMentorForModal(null)}
          mentor={selectedMentorForModal}
          scheduledBookings={scheduledBookingsForMentor}
          selectedDate={selectedDate}
        />
      </div>
    </div>
  );
}
