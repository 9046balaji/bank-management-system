/**
 * Loading Components
 * Various loading states for different parts of the application
 */

import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'primary' | 'white' | 'gray';
  className?: string;
}

/**
 * Loading Spinner
 * Animated circular loading indicator
 */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  color = 'primary',
  className = '',
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  const colorClasses = {
    primary: 'text-blue-600',
    white: 'text-white',
    gray: 'text-gray-400',
  };

  return (
    <div
      role="status"
      aria-label="Loading"
      className={`inline-flex ${className}`}
    >
      <svg
        className={`animate-spin ${sizeClasses[size]} ${colorClasses[color]}`}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      <span className="sr-only">Loading...</span>
    </div>
  );
};

/**
 * Page Loading
 * Full-page loading state
 */
export const PageLoading: React.FC<{ message?: string }> = ({ 
  message = 'Loading...' 
}) => {
  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900"
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      {/* Animated Logo */}
      <div className="mb-8">
        <div className="text-4xl font-bold">
          <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent animate-pulse">
            Aura Bank
          </span>
        </div>
      </div>

      {/* Spinner */}
      <LoadingSpinner size="xl" color="white" />
      
      {/* Message */}
      <p className="mt-6 text-white/70 text-sm animate-pulse">
        {message}
      </p>
    </div>
  );
};

/**
 * Section Loading
 * Loading state for smaller sections
 */
export const SectionLoading: React.FC<{ 
  message?: string;
  className?: string;
}> = ({ 
  message = 'Loading...',
  className = '',
}) => {
  return (
    <div 
      className={`flex flex-col items-center justify-center p-8 ${className}`}
      role="status"
      aria-busy="true"
    >
      <LoadingSpinner size="lg" color="primary" />
      <p className="mt-4 text-gray-500 dark:text-gray-400 text-sm">
        {message}
      </p>
    </div>
  );
};

/**
 * Card Loading Skeleton
 * Placeholder for card content while loading
 */
export const CardSkeleton: React.FC<{ rows?: number }> = ({ rows = 3 }) => {
  return (
    <div className="animate-pulse p-6 bg-white dark:bg-gray-800 rounded-xl" role="status">
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
      {Array.from({ length: rows }).map((_, i) => (
        <div 
          key={i} 
          className="h-3 bg-gray-200 dark:bg-gray-700 rounded mb-3"
          style={{ width: `${100 - (i * 15)}%` }}
        ></div>
      ))}
      <span className="sr-only">Loading...</span>
    </div>
  );
};

/**
 * Table Loading Skeleton
 * Placeholder for table content while loading
 */
export const TableSkeleton: React.FC<{ 
  rows?: number;
  columns?: number;
}> = ({ 
  rows = 5, 
  columns = 4 
}) => {
  return (
    <div className="animate-pulse" role="status">
      {/* Header */}
      <div className="flex gap-4 mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
        {Array.from({ length: columns }).map((_, i) => (
          <div 
            key={i} 
            className="h-4 bg-gray-200 dark:bg-gray-700 rounded flex-1"
          ></div>
        ))}
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4 mb-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div 
              key={colIndex} 
              className="h-3 bg-gray-200 dark:bg-gray-700 rounded flex-1"
            ></div>
          ))}
        </div>
      ))}
      <span className="sr-only">Loading...</span>
    </div>
  );
};

/**
 * Dashboard Loading Skeleton
 * Full dashboard placeholder
 */
export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="animate-pulse p-6 space-y-6" role="status">
      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-6 bg-white dark:bg-gray-800 rounded-xl">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-3"></div>
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          </div>
        ))}
      </div>
      
      {/* Chart Area */}
      <div className="p-6 bg-white dark:bg-gray-800 rounded-xl">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-6"></div>
        <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>
      
      {/* Transactions */}
      <div className="p-6 bg-white dark:bg-gray-800 rounded-xl">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-6"></div>
        <TableSkeleton rows={5} columns={4} />
      </div>
      
      <span className="sr-only">Loading dashboard...</span>
    </div>
  );
};

/**
 * Inline Loading
 * Small inline loading indicator
 */
export const InlineLoading: React.FC<{ text?: string }> = ({ 
  text = 'Loading' 
}) => {
  return (
    <span className="inline-flex items-center gap-2 text-gray-500" role="status">
      <LoadingSpinner size="sm" color="gray" />
      <span className="text-sm">{text}</span>
    </span>
  );
};

export default LoadingSpinner;
