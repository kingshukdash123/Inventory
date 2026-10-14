import { NavLink } from 'react-router-dom';
import { 
  Pill, 
  LayoutDashboard,
  Receipt, 
  Package, 
  Settings, 
  X,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  UserCheck
} from 'lucide-react';

export default function Sidebar({ isOpen, onClose, isCollapsed = false, onToggleCollapse }) {
  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/collection_bill', label: 'Medicine Collection', icon: Receipt },
    { path: '/selling_bill', label: 'Medicine Selling', icon: TrendingUp },
    { path: '/doctors', label: 'Doctor Details', icon: UserCheck },
    { path: '/stock', label: 'Medicine Stock', icon: Package },
    { path: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className={`fixed inset-y-0 left-0 z-50 bg-zinc-950 border-r border-zinc-800 flex flex-col justify-between h-screen lg:h-full shrink-0 text-zinc-300 select-none transition-all duration-300 ease-in-out lg:static lg:translate-x-0 ${
      isCollapsed ? 'lg:w-16 w-64' : 'w-64'
    } ${
      isOpen ? 'translate-x-0' : '-translate-x-full'
    }`}>
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Logo Header */}
        <div className={`h-16 flex items-center border-b border-zinc-800/80 px-4 shrink-0 ${
          isCollapsed ? 'lg:justify-center' : 'justify-between px-6'
        }`}>
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-zinc-850 border border-zinc-700/60 flex items-center justify-center text-zinc-100 shadow-sm shrink-0">
              <Pill className="h-5 w-5" />
            </div>
            {!isCollapsed && (
              <div className="animate-fadeIn">
                <div className="flex items-center gap-1.5">
                  <h1 className="font-semibold text-zinc-100 tracking-tight leading-none text-base">Inventory</h1>
                  <span className="text-[11px] font-bold bg-zinc-900 border border-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded-md font-mono leading-none">
                    v1.0.0
                  </span>
                </div>
                <span className="text-[11px] text-zinc-550 font-medium">Inventory & Bills</span>
              </div>
            )}
          </div>
          <button 
            onClick={onClose}
            className="lg:hidden p-1 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="px-3 space-y-1 mt-4 flex-1">
          <div className={`px-3 py-1 flex items-center text-[10px] font-semibold text-zinc-550 uppercase tracking-wider ${
            isCollapsed ? 'justify-center my-2' : 'justify-between mb-2'
          }`}>
            {!isCollapsed && <span className="animate-fadeIn">Management</span>}
            <button
              onClick={onToggleCollapse}
              className="p-1 rounded hover:bg-zinc-900 text-zinc-500 hover:text-zinc-200 transition-colors shrink-0"
              title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
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
                  `flex items-center ${
                    isCollapsed 
                      ? 'justify-center h-10 w-10 mx-auto rounded-lg' 
                      : 'w-full justify-between px-3 py-2.5 rounded-md'
                  } text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-zinc-800/85 text-zinc-100 border border-zinc-700/60 shadow-sm'
                      : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                  }`
                }
                title={isCollapsed ? item.label : undefined}
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-3">
                      <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-zinc-200' : 'text-zinc-500'}`} />
                      {!isCollapsed && <span className="animate-fadeIn">{item.label}</span>}
                    </div>
                    {!isCollapsed && item.badge && (
                      <span className="text-[10px] font-medium bg-zinc-800 text-zinc-300 border border-zinc-700 px-1.5 py-0.5 rounded animate-fadeIn">
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
