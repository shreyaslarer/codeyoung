"use client";

import React from "react";
import { CalendarCheck, Users, PieChart, Zap } from "lucide-react";
import { MetricCardData } from "@/types/dashboard.types";

interface MetricsGridProps {
  metrics: readonly MetricCardData[];
}

export function MetricsGrid({ metrics }: MetricsGridProps) {
  const getIcon = (iconName: MetricCardData["iconName"]) => {
    switch (iconName) {
      case "calendar":
        return <CalendarCheck className="w-4.5 h-4.5 text-[#D98B0F]" />;
      case "users":
        return <Users className="w-4.5 h-4.5 text-[#4A60E8]" />;
      case "pie":
        return <PieChart className="w-4.5 h-4.5 text-[#00A86B]" />;
      case "zap":
        return <Zap className="w-4.5 h-4.5 text-[#D98B0F]" />;
    }
  };

  const getDelayClass = (index: number) => {
    switch (index) {
      case 0:
        return "delay-75";
      case 1:
        return "delay-150";
      case 2:
        return "delay-200";
      default:
        return "delay-250";
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric, idx) => (
        <div
          key={metric.id}
          className={`bg-white rounded-2xl p-5 shadow-card border border-[#CBD5E1] flex flex-col justify-between card-lift anim-fade-up ${getDelayClass(
            idx
          )}`}
        >
          {/* Card Top: Title + Icon */}
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold font-mono tracking-wider text-slate-500 uppercase">
              {metric.title}
            </span>
            <div className="p-1.5 rounded-lg bg-[#F8FAFC] border border-[#CBD5E1]/60">
              {getIcon(metric.iconName)}
            </div>
          </div>

          {/* Card Middle & Bottom: Value + Fraction + Microcopy */}
          <div className="mt-4">
            <div className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] leading-none tabular-nums tracking-tight">
              {metric.value}
              {metric.total !== undefined && (
                <span className="text-sm font-semibold text-slate-400 ml-1.5 font-mono">
                  / {metric.total}
                </span>
              )}
            </div>

            <div className="text-xs text-slate-600 mt-2.5 flex items-center gap-1.5 font-medium">
              {metric.indicatorColor && (
                <span
                  className="inline-block w-2 h-2 rounded-full animate-pulse"
                  style={{ backgroundColor: metric.indicatorColor }}
                />
              )}
              <span>{metric.subtext}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
