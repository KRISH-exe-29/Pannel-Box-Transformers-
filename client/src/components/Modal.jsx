import React, { useEffect, useCallback } from 'react';
import { X } from 'lucide-react';

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  confirmText = 'Confirm',
  onConfirm,
  confirmColor = 'amber',
  showFooter = true
}) {
  const handleEscape = useCallback((e) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleEscape]);

  if (!isOpen) return null;

  const confirmBtnClass = confirmColor === 'danger'
    ? 'btn-danger'
    : 'btn-primary';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative bg-[#1E293B] border border-[#334155] rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-[#334155]">
          <h3 className="text-lg font-semibold text-[#F8FAFC]">{title}</h3>
          <button
            onClick={onClose}
            className="text-[#94A3B8] hover:text-[#F8FAFC] transition-colors p-1 rounded-lg hover:bg-white/5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {children}
        </div>

        {showFooter && (
          <div className="flex items-center justify-end gap-3 p-6 border-t border-[#334155]">
            <button onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            {onConfirm && (
              <button onClick={onConfirm} className={confirmBtnClass}>
                {confirmText}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
