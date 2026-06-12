import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F172A] px-4">
      <div className="text-center max-w-md">
        <h1 className="text-9xl font-bold text-[#F59E0B] mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-[#F8FAFC] mb-6">Page Not Found</h2>
        <p className="text-[#94A3B8] mb-8">
          The page you are looking for doesn't exist or has been moved.
        </p>
        <Link 
          to="/dashboard" 
          className="btn-primary inline-flex"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
