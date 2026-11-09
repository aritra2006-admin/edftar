import Link from "next/link";
import { FileText, Shield, Zap, Heart } from "@/components/Icons";

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 mt-auto border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand Column */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-rose-500 flex items-center justify-center text-white font-black text-lg shadow-md shadow-brand-600/30">
                <FileText className="w-5 h-5" />
              </div>
              <span className="text-2xl font-black tracking-tight text-white">
                Ed<span className="text-brand-500">ftar</span>
              </span>
            </div>
            <p className="text-sm text-slate-400 max-w-md leading-relaxed">
              Edftar is a privacy-first, 100% free online PDF toolbox. All processing happens entirely inside your browser memory — your documents never touch any server.
            </p>
            <div className="flex items-center gap-4 text-xs text-slate-400 pt-2">
              <span className="flex items-center gap-1 text-emerald-400 font-medium">
                <Shield className="w-3.5 h-3.5" /> 100% Client-Side Privacy
              </span>
              <span className="flex items-center gap-1 text-amber-400 font-medium">
                <Zap className="w-3.5 h-3.5" /> Zero Upload Lag
              </span>
            </div>
          </div>

          {/* Quick Tools */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-white mb-4">PDF Tools</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/merge-pdf" className="hover:text-brand-400 transition-colors">Merge PDF</Link>
              </li>
              <li>
                <Link href="/split-pdf" className="hover:text-brand-400 transition-colors">Split PDF</Link>
              </li>
              <li>
                <Link href="/rotate-pdf" className="hover:text-brand-400 transition-colors">Rotate PDF</Link>
              </li>
              <li>
                <Link href="/organize-pdf" className="hover:text-brand-400 transition-colors">Organize & Delete</Link>
              </li>
              <li>
                <Link href="/edit-word" className="hover:text-brand-400 transition-colors">Edit Word Online</Link>
              </li>
            </ul>
          </div>

          {/* Converters */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-white mb-4">Converters</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/jpg-to-pdf" className="hover:text-brand-400 transition-colors">JPG / PNG to PDF</Link>
              </li>
              <li>
                <Link href="/pdf-to-jpg" className="hover:text-brand-400 transition-colors">PDF to JPG</Link>
              </li>
              <li>
                <Link href="/word-to-pdf" className="hover:text-brand-400 transition-colors">Word to PDF</Link>
              </li>
              <li>
                <Link href="/pdf-to-word" className="hover:text-brand-400 transition-colors">PDF to Word</Link>
              </li>
              <li>
                <Link href="/compress-pdf" className="hover:text-brand-400 transition-colors">Compress PDF</Link>
              </li>
              <li>
                <Link href="/compress-image" className="hover:text-brand-400 transition-colors">Compress Images</Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} Edftar. Built with privacy-first client WebAssembly & pdf-lib.</p>
          <p className="flex items-center gap-1">
            Recreated with <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" /> & REA guidance
          </p>
        </div>
      </div>
    </footer>
  );
}
