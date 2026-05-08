"use client";

import dynamic from "next/dynamic";

const ClientShell = dynamic(() => import("./client-shell"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4">
      <div className="w-8 h-8 relative">
        <div className="w-full h-full border border-slate-200 border-t-slate-900 rounded-full animate-spin" />
      </div>
      <span className="text-[9px] font-bold text-slate-300 uppercase tracking-[0.3em] animate-pulse">
        INITIALIZING
      </span>
    </div>
  ),
});

export default function HomePage() {
  return <ClientShell />;
}
