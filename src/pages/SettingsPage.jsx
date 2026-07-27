import React from 'react';
import { Settings } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="p-12 text-center space-y-4 max-w-xl mx-auto">
      <div className="h-14 w-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-amber-400">
        <Settings className="h-7 w-7" />
      </div>
      <h3 className="text-lg font-bold text-zinc-100">System Preferences</h3>
      <p className="text-xs text-zinc-400">
        Database synchronization settings, local draft management, and bill printing options.
      </p>
    </div>
  );
}
