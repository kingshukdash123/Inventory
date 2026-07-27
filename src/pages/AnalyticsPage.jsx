import React from 'react';
import { BarChart3 } from 'lucide-react';

export default function AnalyticsPage() {
  return (
    <div className="p-12 text-center space-y-4 max-w-xl mx-auto">
      <div className="h-14 w-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-emerald-400">
        <BarChart3 className="h-7 w-7" />
      </div>
      <h3 className="text-lg font-bold text-zinc-100">Taxation & Financial Reports</h3>
      <p className="text-xs text-zinc-400">
        Automated CGST/SGST tax summaries and purchase reports generated strictly from published bills.
      </p>
    </div>
  );
}
