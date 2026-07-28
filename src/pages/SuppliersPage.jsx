import React from 'react';
import { Users } from 'lucide-react';

export default function SuppliersPage() {
  return (
    <div className="p-12 text-center space-y-4 max-w-xl mx-auto">
      <div className="h-14 w-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-100">
        <Users className="h-7 w-7" />
      </div>
      <h3 className="text-lg font-bold text-zinc-100">Pharma Suppliers Directory</h3>
      <p className="text-xs text-zinc-400">
        Manage supplier accounts, contact details, outstanding invoices, and purchase order histories.
      </p>
    </div>
  );
}
