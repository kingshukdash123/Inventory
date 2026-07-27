import React from 'react';
import { Package } from 'lucide-react';

export default function InventoryPage() {
  return (
    <div className="p-12 text-center space-y-4 max-w-xl mx-auto">
      <div className="h-14 w-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-violet-400">
        <Package className="h-7 w-7" />
      </div>
      <h3 className="text-lg font-bold text-zinc-100">Medicine Stock Inventory</h3>
      <p className="text-xs text-zinc-400">
        All published collected medicine items automatically populate into your live stock inventory.
      </p>
    </div>
  );
}
