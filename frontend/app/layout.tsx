import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Book a Free Trial Class | Codeyoung",
  description: "Schedule a 1-on-1 trial class in your local timezone with Codeyoung's expert STEM and coding mentors.",
  icons: {
    icon: "/primary_logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans bg-[#DFE4EA] text-[#0F172A]">
        {children}
      </body>
    </html>
  );
}
