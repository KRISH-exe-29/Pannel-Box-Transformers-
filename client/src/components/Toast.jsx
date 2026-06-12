import React, { useEffect } from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

const iconMap = {
  success: CheckCircle,
  error: XCircle,
  info: Info
};

const colorMap = {
  success: {
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
    icon: 'text-green-400',
    text: 'text-green-300'
  },
  error: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    icon: 'text-red-400',
    text: 'text-red-300'
  },
  info: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    icon: 'text-amber-400',
    text: 'text-amber-300'
  }
};

export default function Toast({ id, type = 'info', message, onClose }) {
  const Icon = iconMap[type] || Info;
  const colors = colorMap[type] || colorMap.info;

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-lg border ${colors.bg} ${colors.border} shadow-lg backdrop-blur-sm min-w-[320px] max-w-[420px] animate-slide-in`}
      role="alert"
    >
      <Icon className={`w-5 h-5 ${colors.icon} flex-shrink-0 mt-0.5`} />
      <p className={`text-sm ${colors.text} flex-1`}>{message}</p>
      <button
        onClick={() => onClose(id)}
        className="text-[#94A3B8] hover:text-[#F8FAFC] transition-colors flex-shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
