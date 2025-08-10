import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const Logo: React.FC<LogoProps> = ({ className = "", size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-16 h-16'
  };

  const rupeeSize = {
    sm: 'w-3 h-3',
    md: 'w-5 h-5', 
    lg: 'w-8 h-8'
  };

  return (
    <div className={`bg-gradient-hero rounded-lg flex items-center justify-center shadow-lg relative ${sizeClasses[size]} ${className}`}>
      {/* Shield Background SVG */}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="absolute inset-0 w-full h-full text-white"
      >
        <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
      </svg>
      
      {/* Rupee Symbol */}
      <div className={`relative z-10 ${rupeeSize[size]} flex items-center justify-center`}>
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-full h-full text-white"
        >
          <path d="M7 7h8M7 11h6.5c1.4 0 2.5 1.1 2.5 2.5S14.9 16 13.5 16H12l3 3M7 7v8l5-4" stroke="currentColor" strokeWidth={1.5} fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </div>
  );
};

export default Logo;