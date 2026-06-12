import React from 'react';
import { Loader2 } from 'lucide-react';

const sizeMap = {
  sm: 16,
  md: 24,
  lg: 40
};

export default function LoadingSpinner({ size = 'md', fullPage = false }) {
  const pixelSize = sizeMap[size] || sizeMap.md;

  if (fullPage) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/80 backdrop-blur-sm">
        <div className="flex flex-col items-center gap-3">
          <Loader2
            className="animate-spin text-[#F59E0B]"
            style={{ width: pixelSize, height: pixelSize }}
          />
          <span className="text-[#94A3B8] text-sm">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center p-8">
      <Loader2
        className="animate-spin text-[#F59E0B]"
        style={{ width: pixelSize, height: pixelSize }}
      />
    </div>
  );
}
