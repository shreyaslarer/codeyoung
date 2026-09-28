import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin & Mentor Portal | Codeyoung",
  description: "Secure login portal for Codeyoung scheduling verification and mentor operations.",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-[#DFE4EA] text-[#0F172A] font-sans antialiased">
      {children}
    </div>
  );
}
