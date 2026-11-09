import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import "./globals.css";

export const metadata: Metadata = {
  title: "Edftar - 100% Free & Private Online PDF Tools",
  description:
    "Merge, split, rotate, organize, and convert PDF files directly in your web browser. Completely private, fast, and secure with no server file uploads.",
  keywords: ["PDF", "Merge PDF", "Split PDF", "Rotate PDF", "JPG to PDF", "PDF to JPG", "Edftar", "iLovePDF alternative"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-slate-50 text-slate-900 antialiased selection:bg-brand-500 selection:text-white">
        <Navbar />
        <main className="flex-1 flex flex-col">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
