import React from 'react';

const colorMap = {
  amber: {
    border: 'border-l-[#F59E0B]',
    iconBg: 'bg-[#F59E0B]/10',
    iconText: 'text-[#F59E0B]',
    valueText: 'text-[#F8FAFC]'
  },
  red: {
    border: 'border-l-red-500',
    iconBg: 'bg-red-500/10',
    iconText: 'text-red-400',
    valueText: 'text-red-400'
  },
  green: {
    border: 'border-l-green-500',
    iconBg: 'bg-green-500/10',
    iconText: 'text-green-400',
    valueText: 'text-[#F8FAFC]'
  },
  blue: {
    border: 'border-l-blue-500',
    iconBg: 'bg-blue-500/10',
    iconText: 'text-blue-400',
    valueText: 'text-[#F8FAFC]'
  }
};

export default function SummaryCard({ title, value, icon: Icon, color = 'amber' }) {
  const colors = colorMap[color] || colorMap.amber;

  return (
    <div className={`bg-[#1E293B] border border-[#334155] rounded-lg p-6 border-l-4 ${colors.border}`}>
      <div className="flex items-start justify-between">
        <div className="flex flex-col">
          <span className={`text-3xl font-bold ${colors.valueText}`}>
            {value ?? 0}
          </span>
          <span className="text-[#94A3B8] text-sm mt-1">{title}</span>
        </div>
        {Icon && (
          <div className={`p-3 rounded-lg ${colors.iconBg}`}>
            <Icon className={`w-6 h-6 ${colors.iconText}`} />
          </div>
        )}
      </div>
    </div>
  );
}
