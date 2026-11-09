import Link from "next/link";
import { 
  Layers, 
  Scissors, 
  RotateCw, 
  Grid, 
  Image as ImageIcon, 
  FileImage, 
  FileWord,
  Archive,
  ShieldCheck, 
  Zap, 
  Lock, 
  Sparkles,
  ArrowRight
} from "@/components/Icons";

export default function Home() {
  const tools = [
    {
      title: "Merge PDF",
      description: "Combine multiple PDF files into one single organized document in seconds.",
      href: "/merge-pdf",
      icon: Layers,
      color: "from-rose-500 to-red-600",
      badge: "Most Popular",
      category: "Organize",
    },
    {
      title: "Split PDF",
      description: "Extract specific page ranges or separate all pages into individual files.",
      href: "/split-pdf",
      icon: Scissors,
      color: "from-amber-500 to-orange-600",
      badge: "Fast",
      category: "Organize",
    },
    {
      title: "Rotate PDF",
      description: "Rotate pages 90, 180, or 270 degrees. Rotate individual pages or all at once.",
      href: "/rotate-pdf",
      icon: RotateCw,
      color: "from-blue-500 to-indigo-600",
      badge: "1-Click",
      category: "Edit",
    },
    {
      title: "Organize PDF",
      description: "Sort, reorder, or delete pages visually using a simple drag & drop thumbnail grid.",
      href: "/organize-pdf",
      icon: Grid,
      color: "from-purple-500 to-violet-600",
      badge: "Visual",
      category: "Organize",
    },
    {
      title: "JPG to PDF",
      description: "Convert images (JPG, PNG) into a high-quality PDF book with customizable margins.",
      href: "/jpg-to-pdf",
      icon: ImageIcon,
      color: "from-emerald-500 to-teal-600",
      badge: "Photos",
      category: "Convert",
    },
    {
      title: "PDF to JPG",
      description: "Extract all pages from a PDF document and save them as crisp, clear JPEG images.",
      href: "/pdf-to-jpg",
      icon: FileImage,
      color: "from-cyan-500 to-blue-600",
      badge: "Export",
      category: "Convert",
    },
    {
      title: "Word to PDF",
      description: "Convert .docx Word documents to print-ready PDF files directly in your browser.",
      href: "/word-to-pdf",
      icon: FileWord,
      color: "from-blue-600 to-indigo-700",
      badge: "New",
      category: "Convert",
    },
    {
      title: "PDF to Word",
      description: "Extract text from PDF and download as an editable .docx Word document.",
      href: "/pdf-to-word",
      icon: FileWord,
      color: "from-indigo-500 to-purple-600",
      badge: "New",
      category: "Convert",
    },
    {
      title: "Compress PDF",
      description: "Reduce PDF file size with adjustable quality — fast, free, and fully private.",
      href: "/compress-pdf",
      icon: Archive,
      color: "from-orange-500 to-red-600",
      badge: "New",
      category: "Optimize",
    },
    {
      title: "Compress Images",
      description: "Batch compress JPG, PNG, WebP images with adjustable quality and max dimensions.",
      href: "/compress-image",
      icon: ImageIcon,
      color: "from-pink-500 to-rose-600",
      badge: "New",
      category: "Optimize",
    },
    {
      title: "Edit Word Online",
      description: "Create, open, and edit Word (.docx) documents in your browser. Rich formatting & instant export.",
      href: "/edit-word",
      icon: FileWord,
      color: "from-blue-600 to-cyan-600",
      badge: "Editor",
      category: "Edit",
    },
    {
      title: "Edit PDF (Adobe Style)",
      description: "Directly annotate, add text, freehand draw, highlight, whiteout, and sign PDF files in your browser.",
      href: "/edit-pdf",
      icon: FileText,
      color: "from-red-600 to-rose-700",
      badge: "Adobe Pro",
      category: "Edit",
    },
  ];

  return (
    <div className="space-y-16 py-8 sm:py-12">
      {/* Hero Section */}
      <section className="max-w-4xl mx-auto px-4 text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-rose-600" />
          <span>The 100% Free, Private &amp; Client-Side PDF Toolkit</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.1]">
          Every tool you need to work with PDFs in{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-rose-500">
            one place
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Edftar is 100% free, runs instantly in your web browser, and keeps your files strictly on your device. Zero uploads to external servers.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            href="/merge-pdf"
            className="px-6 py-3.5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm shadow-md shadow-brand-600/25 transition-all flex items-center gap-2"
          >
            Start with Merge PDF
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/organize-pdf"
            className="px-6 py-3.5 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm border border-slate-200 shadow-xs transition-all"
          >
            Organize Pages
          </Link>
        </div>
      </section>

      {/* Tools Catalog */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Featured PDF Tools</h2>
            <p className="text-sm text-slate-500">Select any tool below to begin processing your documents.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link
                key={tool.title}
                href={tool.href}
                className="group relative p-6 bg-white rounded-3xl border border-slate-200/90 hover:border-brand-500/50 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between overflow-hidden"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div
                      className={`w-14 h-14 rounded-2xl bg-gradient-to-tr ${tool.color} text-white flex items-center justify-center shadow-md shadow-brand-500/20 group-hover:scale-110 transition-transform`}
                    >
                      <Icon className="w-7 h-7 stroke-[2]" />
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full transition-colors ${
                      tool.badge === "New"
                        ? "bg-emerald-100 text-emerald-700 group-hover:bg-emerald-200"
                        : "bg-slate-100 text-slate-600 group-hover:bg-brand-50 group-hover:text-brand-600"
                    }`}>
                      {tool.badge}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-slate-900 group-hover:text-brand-600 transition-colors">
                      {tool.title}
                    </h3>
                    <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                      {tool.description}
                    </p>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-brand-600 group-hover:translate-x-1 transition-transform">
                  <span>Open Tool</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Privacy Guarantee Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-gradient-to-b from-slate-900 to-slate-950 text-white p-8 sm:p-12 border border-slate-800 shadow-xl space-y-8">
          <div className="max-w-2xl space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Security Guarantee</span>
            <h2 className="text-3xl font-black tracking-tight">
              Your documents never leave your browser
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Unlike cloud services that require you to upload your personal PDF files to their servers, Edftar executes all PDF modifications locally in your computer&apos;s memory using JavaScript and WebAssembly.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-800">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-white mb-1">Total Privacy</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Tax returns, IDs, medical records, and legal contracts stay 100% confidential.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-white mb-1">Instant Execution</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  No slow upload queues or network throttling. Edftar operates as fast as your CPU allows.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-white mb-1">No File Size Limits</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Modify large files freely without encountering arbitrary paywalls or subscription limits.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
