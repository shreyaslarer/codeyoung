import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Scheduling Verification | Codeyoung Internal Dashboard",
  description: "Internal engineering dashboard for verifying live trial bookings, mentor allocation, capacity constraints, and timezone resolution.",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#DFE4EA] text-[#0F172A] font-sans antialiased">
      {children}
    </div>
  );
}
