import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Pill, 
  LayoutDashboard,
  Receipt, 
  Package, 
  Users, 
  BarChart3, 
  Settings, 
  Database,
  X
} from 'lucide-react';

export default function Sidebar({ isOpen, onClose }) {
  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/collection', label: 'Medicine Collection', icon: Receipt, badge: 'Bills' },
    { path: '/inventory', label: 'Medicine Stock', icon: Package },
    { path: '/suppliers', label: 'Pharma Suppliers', icon: Users },
    { path: '/analytics', label: 'Tax & Analytics', icon: BarChart3 },
    { path: '/settings', label: 'System Settings', icon: Settings },
  ];

  return (
    <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-zinc-950 border-r border-zinc-800 flex flex-col justify-between min-h-screen text-zinc-300 select-none transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
      isOpen ? 'translate-x-0' : '-translate-x-full'
    }`}>
      <div>
        {/* Logo Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-zinc-800/80">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-100 shadow-sm">
              <Pill className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-semibold text-zinc-100 tracking-tight leading-none text-base">Inventory</h1>
                <span className="text-[11px] font-bold bg-zinc-900 border border-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded-md font-mono leading-none">
                  v1.0.0
                </span>
              </div>
              <span className="text-[11px] text-zinc-500 font-medium">Inventory & Bills</span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="lg:hidden p-1 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="px-3 space-y-1 mt-4">
          <div className="px-3 py-2 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
            Management
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                onClick={onClose}
                className={({ isActive }) =>
                  `w-full flex items-center justify-between px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-zinc-800/85 text-zinc-100 border border-zinc-700/60 shadow-sm'
                      : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-3">
                      <Icon className={`h-4 w-4 ${isActive ? 'text-zinc-200' : 'text-zinc-500'}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[10px] font-medium bg-zinc-800 text-zinc-300 border border-zinc-700 px-1.5 py-0.5 rounded">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
