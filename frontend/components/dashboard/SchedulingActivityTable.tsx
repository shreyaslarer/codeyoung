"use client";

import React, { useState } from "react";
import { Download, Globe, Search, Copy, Check, Code, X, ExternalLink } from "lucide-react";
import { BookingActivityItem } from "@/types/dashboard.types";

interface SchedulingActivityTableProps {
  activities: readonly BookingActivityItem[];
  onSelectMentor?: (mentorCode: string) => void;
}

export function SchedulingActivityTable({
  activities,
  onSelectMentor,
}: SchedulingActivityTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [inspectBooking, setInspectBooking] = useState<BookingActivityItem | null>(null);

  const filteredActivities = activities.filter((item) => {
    const query = searchTerm.toLowerCase();
    return (
      item.id.toLowerCase().includes(query) ||
      item.parentName.toLowerCase().includes(query) ||
      item.parentEmail.toLowerCase().includes(query) ||
      item.timezoneDetail.toLowerCase().includes(query) ||
      item.mentor.name.toLowerCase().includes(query)
    );
  });

  const getMentorTrackClasses = (track: BookingActivityItem["mentor"]["track"]) => {
    switch (track) {
      case "CODING":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "MATH":
        return "bg-amber-50 text-amber-800 border-amber-200";
      case "SCIENCE":
        return "bg-emerald-50 text-emerald-800 border-emerald-200";
      case "ENGLISH":
        return "bg-cyan-50 text-cyan-800 border-cyan-200";
      case "ROBOTICS":
        return "bg-rose-50 text-rose-800 border-rose-200";
      case "FINANCE":
        return "bg-purple-50 text-purple-800 border-purple-200";
      default:
        return "bg-orange-50 text-orange-800 border-orange-200";
    }
  };

  const handleCopyId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleExportCsv = () => {
    const headers = [
      "Booking ID",
      "Parent Name",
      "Parent Email",
      "Parent Local Time",
      "Timezone",
      "Assigned Mentor Code",
      "Assigned Mentor Name",
      "Slot IST",
      "Status",
    ];

    const rows = filteredActivities.map((item) => [
      `"${item.id}"`,
      `"${item.parentName}"`,
      `"${item.parentEmail}"`,
      `"${item.parentLocalTime}"`,
      `"${item.timezoneDetail}"`,
      `"Mentor ${item.mentor.code}"`,
      `"${item.mentor.name}"`,
      `"${item.slotIst}"`,
      `"${item.status}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((e) => e.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `codeyoung-scheduling-activity.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-2xl shadow-card border border-[#CBD5E1] overflow-hidden flex flex-col card-lift anim-fade-up delay-250">
      {/* Header with Title and Controls */}
      <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100">
        <div>
          <h3 className="text-base font-bold text-[#0F172A] tracking-tight">
            Scheduling Activity Registry
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time verified booking records with parent local time and allocated mentor.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter by ID, parent, mentor..."
              className="pl-8 pr-2.5 py-1.5 text-xs bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#D98B0F] focus:ring-1 focus:ring-[#F5A623]/30 focus:bg-white text-slate-900 placeholder:text-slate-400 w-44 sm:w-56 transition-all"
            />
          </div>

          {/* Verified Count Pill */}
          <span className="px-2.5 py-1.5 rounded-lg bg-[#F8FAFC] border border-[#CBD5E1] text-slate-700 text-xs font-mono font-semibold">
            {filteredActivities.length} / {activities.length} logged
          </span>

          {/* Export CSV Button */}
          <button
            type="button"
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] hover:bg-white text-slate-700 hover:text-slate-950 text-xs font-semibold transition-all cursor-pointer shadow-control active:scale-95"
            title="Export CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden md:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {/* Dense Utility Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-[#F8FAFC] border-b border-[#CBD5E1]/80 text-slate-500 uppercase tracking-wider text-[11px] font-mono font-semibold">
              <th className="py-3 px-4" scope="col">Booking ID</th>
              <th className="py-3 px-4" scope="col">Parent</th>
              <th className="py-3 px-4" scope="col">Parent Local Time</th>
              <th className="py-3 px-4" scope="col">Timezone</th>
              <th className="py-3 px-4" scope="col">Assigned Mentor</th>
              <th className="py-3 px-4" scope="col">Slot IST</th>
              <th className="py-3 px-4 text-center" scope="col">JSON</th>
              <th className="py-3 px-4 text-right" scope="col">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-[#0F172A]">
            {filteredActivities.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-10 text-center text-xs text-slate-500">
                  No scheduling records match &quot;{searchTerm}&quot;
                </td>
              </tr>
            ) : (
              filteredActivities.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-[#F8FAFC]/80 transition-colors group cursor-default"
                >
                  {/* Booking ID + Copy Action */}
                  <td className="py-3 px-4 font-mono text-[11px] font-semibold text-slate-900">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-800">{item.id}</span>
                      <button
                        type="button"
                        onClick={(e) => handleCopyId(item.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-slate-200/70 transition-all text-slate-500 hover:text-slate-900 cursor-pointer"
                        title="Copy Booking ID"
                      >
                        {copiedId === item.id ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </td>

                  {/* Parent Name & Email */}
                  <td className="py-3 px-4">
                    <div className="font-bold text-[#0F172A]">{item.parentName}</div>
                    <div className="text-[11px] text-slate-500 font-mono">{item.parentEmail}</div>
                  </td>

                  {/* Parent Local Time */}
                  <td className="py-3 px-4 font-bold text-[#0F172A] tabular-nums">
                    {item.parentLocalTime}
                  </td>

                  {/* Timezone */}
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-700 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                      <Globe className="w-3 h-3 text-[#D98B0F] shrink-0" />
                      <span className="truncate max-w-[190px] font-medium">{item.timezoneDetail}</span>
                    </span>
                  </td>

                  {/* Assigned Mentor */}
                  <td className="py-3 px-4">
                    <button
                      type="button"
                      onClick={() => onSelectMentor?.(item.mentor.code)}
                      className="inline-flex items-center gap-1.5 hover:bg-slate-100 px-1.5 py-1 -mx-1.5 rounded-lg transition-colors cursor-pointer text-left group/m"
                      title={`Click to view Mentor ${item.mentor.code} (${item.mentor.name}) schedule & meeting room URL`}
                    >
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-mono font-bold border ${getMentorTrackClasses(
                          item.mentor.track
                        )}`}
                      >
                        {item.mentor.code}
                      </div>
                      <span className="font-bold text-xs text-[#0F172A] group-hover/m:text-[#D98B0F] transition-colors">
                        Mentor {item.mentor.code}
                      </span>
                      <span className="text-slate-500 text-[11px]">({item.mentor.name})</span>
                    </button>
                  </td>

                  {/* Slot IST */}
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-600 tabular-nums font-semibold">
                    {item.slotIst}
                  </td>

                  {/* JSON Peek Trigger */}
                  <td className="py-3 px-4 text-center">
                    <button
                      type="button"
                      onClick={() => setInspectBooking(item)}
                      className="p-1 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Inspect raw JSON payload"
                    >
                      <Code className="w-3.5 h-3.5" />
                    </button>
                  </td>

                  {/* Status Badge */}
                  <td className="py-3 px-4 text-right">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-mono font-bold border border-emerald-300/80">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      <span>{item.status}</span>
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* JSON Schema Inspection Modal */}
      {inspectBooking && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setInspectBooking(null)}
        >
          <div
            className="bg-white rounded-2xl border border-[#CBD5E1] shadow-2xl max-w-lg w-full p-5 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4 text-[#D98B0F]" />
                <h4 className="text-sm font-bold text-[#0F172A]">
                  Raw Document Payload
                </h4>
                <span className="text-[10px] font-mono bg-slate-100 px-1.5 py-0.2 rounded text-slate-700">
                  {inspectBooking.id}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setInspectBooking(null)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <pre className="p-3.5 rounded-xl bg-[#0F172A] text-slate-200 text-xs font-mono overflow-x-auto max-h-72 leading-relaxed">
              {JSON.stringify(
                {
                  _id: inspectBooking.id,
                  parentName: inspectBooking.parentName,
                  parentEmail: inspectBooking.parentEmail,
                  parentLocalTime: inspectBooking.parentLocalTime,
                  timezone: inspectBooking.timezoneDetail,
                  assignedMentor: {
                    code: inspectBooking.mentor.code,
                    name: inspectBooking.mentor.name,
                    track: inspectBooking.mentor.track,
                  },
                  slotIst: inspectBooking.slotIst,
                  status: inspectBooking.status,
                  verifiedAt: new Date().toISOString(),
                },
                null,
                2
              )}
            </pre>

            <div className="flex items-center justify-between pt-2 text-xs text-slate-500 font-mono">
              <span>Collection: bookings</span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(inspectBooking, null, 2));
                  setInspectBooking(null);
                }}
                className="px-3 py-1 rounded-lg bg-[#F8FAFC] border border-[#CBD5E1] text-slate-700 hover:bg-slate-100 font-semibold cursor-pointer"
              >
                Copy JSON
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
