import { X } from 'lucide-react';

// Generic centered modal — overlay click and the X button both close it.
// `widthClass` lets callers size the dialog (defaults to a medium card).
export default function Modal({ title, onClose, children, footer, widthClass = 'max-w-lg' }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={onClose}
    >
      <div
        className={`w-full ${widthClass} max-h-[85vh] flex flex-col bg-white rounded-2xl shadow-xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#EDEFEF] shrink-0">
          <h3 className="font-display text-lg font-semibold text-[#1E2422]">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-[#8A938D] hover:text-[#1E2422] transition"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-5 overflow-y-auto">{children}</div>

        {footer && (
          <div className="px-6 py-4 border-t border-[#EDEFEF] shrink-0">{footer}</div>
        )}
      </div>
    </div>
  );
}