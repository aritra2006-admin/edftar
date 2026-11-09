"use client";

import Link from "next/link";
import { useState } from "react";
import { 
  FileText, 
  Layers, 
  Scissors, 
  RotateCw, 
  Grid, 
  Image as ImageIcon, 
  FileImage, 
  FileWord,
  ShieldCheck, 
  Menu, 
  X 
} from "@/components/Icons";

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const tools = [
    { name: "Merge PDF", href: "/merge-pdf", icon: Layers },
    { name: "Split PDF", href: "/split-pdf", icon: Scissors },
    { name: "Rotate PDF", href: "/rotate-pdf", icon: RotateCw },
    { name: "Organize PDF", href: "/organize-pdf", icon: Grid },
    { name: "JPG to PDF", href: "/jpg-to-pdf", icon: ImageIcon },
    { name: "PDF to JPG", href: "/pdf-to-jpg", icon: FileImage },
    { name: "Word to PDF", href: "/word-to-pdf", icon: FileWord },
    { name: "PDF to Word", href: "/pdf-to-word", icon: FileWord },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-rose-500 flex items-center justify-center text-white shadow-md shadow-rose-500/20 group-hover:scale-105 transition-transform">
              <FileText className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-2xl font-black tracking-tight text-slate-900">
                  Ed<span className="text-brand-600">ftar</span>
                </span>
                <span className="hidden sm:inline-flex items-center text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <ShieldCheck className="w-3 h-3 mr-1 inline" /> 100% Private
                </span>
              </div>
            </div>
          </Link>

          {/* Desktop Nav - scrollable */}
          <nav className="hidden md:flex items-center gap-1 overflow-x-auto">
            {tools.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:text-brand-600 hover:bg-brand-50/70 transition-colors whitespace-nowrap"
                >
                  <Icon className="w-4 h-4 text-slate-400 group-hover:text-brand-600" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* CTA / Action */}
          <div className="hidden lg:flex items-center gap-3">
            <Link
              href="/merge-pdf"
              className="inline-flex items-center justify-center px-4 py-2 rounded-xl text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white shadow-sm shadow-brand-600/25 transition-all"
            >
              Get Started
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 bg-white px-4 pt-2 pb-4 space-y-1">
          {tools.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-base font-medium text-slate-700 hover:text-brand-600 hover:bg-brand-50 transition-colors"
              >
                <Icon className="w-5 h-5 text-slate-400" />
                {item.name}
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
