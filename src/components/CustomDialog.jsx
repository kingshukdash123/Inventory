import { AlertTriangle, Check, Info } from 'lucide-react';

export default function CustomDialog({ 
  isOpen, 
  title, 
  message, 
  type = 'info', // 'info' | 'warning' | 'danger' | 'success'
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isConfirm = false, // If true, shows both Cancel and Confirm buttons. If false, shows only OK button.
  onConfirm, 
  onCancel 
}) {
  if (!isOpen) return null;

  const typeConfig = {
    info: {
      icon: Info,
      iconClass: 'text-zinc-200 bg-zinc-800 border-zinc-750',
      btnClass: 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-750'
    },
    warning: {
      icon: AlertTriangle,
      iconClass: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      btnClass: 'bg-amber-600 hover:bg-amber-500 text-white'
    },
    danger: {
      icon: AlertTriangle,
      iconClass: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
      btnClass: 'bg-rose-600 hover:bg-rose-500 text-white'
    },
    success: {
      icon: Check,
      iconClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      btnClass: 'bg-emerald-600 hover:bg-emerald-500 text-white'
    }
  };

  const config = typeConfig[type] || typeConfig.info;
  const Icon = config.icon;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm select-none">
      <div className="bg-zinc-950 border border-zinc-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header/Content Area */}
        <div className="p-6 flex gap-4">
          <div className={`h-10 w-10 shrink-0 rounded-xl border flex items-center justify-center ${config.iconClass}`}>
            <Icon className="h-5 w-5" />
          </div>

          <div className="space-y-1.5 flex-1">
            <h3 className="text-sm font-bold text-zinc-100">{title}</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">{message}</p>
          </div>
        </div>

        {/* Footer Area */}
        <div className="px-6 py-4 bg-zinc-900/40 border-t border-zinc-800 flex justify-end gap-2.5">
          {isConfirm ? (
            <>
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 bg-transparent hover:bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs font-semibold rounded-lg transition-colors"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${config.btnClass}`}
              >
                {confirmLabel}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onConfirm}
              className="px-5 py-2 bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-bold rounded-lg transition-colors border border-zinc-200/20"
            >
              OK
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
