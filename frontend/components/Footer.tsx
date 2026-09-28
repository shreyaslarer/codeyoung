"use client";

import React from "react";
import Image from "next/image";

export function Footer() {
  return (
    <footer className="w-full bg-[#D6DCE4] border-t border-[#CBD5E1] py-6 mt-auto">
      <div className="max-w-7xl mx-auto px-4 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600">
        <div className="flex items-center gap-2.5">
          <Image
            src="/primary_logo.png"
            alt="Codeyoung"
            width={120}
            height={38}
            className="h-7 sm:h-7.5 w-auto object-contain opacity-90 hover:opacity-100 transition-opacity"
          />
          <span>© 2026 Codeyoung. Trial-Class Booking.</span>
        </div>
        <nav className="flex items-center gap-4 text-slate-600">
          <a href="#" className="hover:text-slate-950 transition-colors">
            Privacy Policy
          </a>
          <span className="text-slate-400">·</span>
          <a href="#" className="hover:text-slate-950 transition-colors">
            Terms
          </a>
          <span className="text-slate-400">·</span>
          <a href="#" className="hover:text-slate-950 transition-colors">
            Help &amp; FAQ
          </a>
        </nav>
      </div>
    </footer>
  );
}
