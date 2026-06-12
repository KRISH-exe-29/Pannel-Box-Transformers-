import React from 'react';

const statusConfig = {
  open: {
    bg: 'bg-red-500/20',
    text: 'text-red-400',
    label: 'Open'
  },
  in_progress: {
    bg: 'bg-amber-500/20',
    text: 'text-amber-400',
    label: 'In Progress'
  },
  closed: {
    bg: 'bg-green-500/20',
    text: 'text-green-400',
    label: 'Closed'
  },
  sent: {
    bg: 'bg-green-500/20',
    text: 'text-green-400',
    label: 'Sent'
  },
  failed: {
    bg: 'bg-red-500/20',
    text: 'text-red-400',
    label: 'Failed'
  },
  reminder: {
    bg: 'bg-amber-500/20',
    text: 'text-amber-400',
    label: 'Reminder'
  },
  follow_up: {
    bg: 'bg-blue-500/20',
    text: 'text-blue-400',
    label: 'Follow-Up'
  },
  active: {
    bg: 'bg-green-500/20',
    text: 'text-green-400',
    label: 'Active'
  },
  inactive: {
    bg: 'bg-red-500/20',
    text: 'text-red-400',
    label: 'Inactive'
  }
};

function formatStatus(status) {
  if (!status) return '';
  const config = statusConfig[status.toLowerCase()];
  if (config) return config.label;
  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function StatusBadge({ status }) {
  if (!status) return null;

  const key = status.toLowerCase();
  const config = statusConfig[key] || {
    bg: 'bg-gray-500/20',
    text: 'text-gray-400',
    label: formatStatus(status)
  };

  return (
    <span className={`status-badge ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}
