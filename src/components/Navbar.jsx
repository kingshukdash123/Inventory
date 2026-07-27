import React from 'react';
import { Search, Bell, Sparkles, Plus } from 'lucide-react';

export default function Navbar({ searchQuery, setSearchQuery }) {
  return (
    <header className="h-16 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800 px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Search Input */}
      <div className="relative w-96">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by Bill No, Medicine name, or Supplier..."
          className="w-full bg-zinc-900 border border-zinc-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-lg pl-9 pr-4 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 outline-none transition-all"
        />
      </div>
    </header>
  );
}
