// Skeleton loading components for better perceived performance

import React from 'react';

interface SkeletonProps {
  className?: string;
  width?: string;
  height?: string;
  rounded?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  width = 'w-full',
  height = 'h-4',
  rounded = false
}) => {
  return (
    <div
      className={`animate-pulse bg-gray-200 ${width} ${height} ${
        rounded ? 'rounded-full' : 'rounded'
      } ${className}`}
    />
  );
};

// Product Card Skeleton
export const ProductCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <Skeleton height="h-48" className="mb-4" />
      <Skeleton height="h-6" className="mb-2" />
      <Skeleton height="h-4" width="w-3/4" className="mb-2" />
      <div className="flex justify-between items-center mt-4">
        <Skeleton height="h-6" width="w-1/3" />
        <Skeleton height="h-8" width="w-1/4" rounded />
      </div>
    </div>
  );
};

// Store Card Skeleton
export const StoreCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <Skeleton height="h-6" width="w-2/3" className="mb-2" />
          <Skeleton height="h-4" width="w-1/2" className="mb-1" />
          <Skeleton height="h-4" width="w-3/4" />
        </div>
        <Skeleton height="h-6" width="w-16" rounded />
      </div>
      <div className="flex items-center justify-between">
        <Skeleton height="h-4" width="w-1/3" />
        <Skeleton height="h-8" width="w-20" rounded />
      </div>
    </div>
  );
};

// Chain Card Skeleton
export const ChainCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex items-center mb-4">
        <Skeleton height="h-12" width="w-12" rounded className="mr-4" />
        <div className="flex-1">
          <Skeleton height="h-6" width="w-1/2" className="mb-2" />
          <Skeleton height="h-4" width="w-3/4" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Skeleton height="h-4" width="w-1/2" className="mb-1" />
          <Skeleton height="h-6" width="w-3/4" />
        </div>
        <div>
          <Skeleton height="h-4" width="w-1/2" className="mb-1" />
          <Skeleton height="h-6" width="w-3/4" />
        </div>
      </div>
    </div>
  );
};

// Table Row Skeleton
export const TableRowSkeleton: React.FC<{ columns: number }> = ({ columns }) => {
  return (
    <tr>
      {Array.from({ length: columns }).map((_, index) => (
        <td key={index} className="px-6 py-4">
          <Skeleton height="h-4" />
        </td>
      ))}
    </tr>
  );
};

// List Item Skeleton
export const ListItemSkeleton: React.FC = () => {
  return (
    <div className="flex items-center space-x-4 p-4">
      <Skeleton height="h-10" width="w-10" rounded />
      <div className="flex-1">
        <Skeleton height="h-4" width="w-1/2" className="mb-2" />
        <Skeleton height="h-3" width="w-3/4" />
      </div>
      <Skeleton height="h-8" width="w-16" rounded />
    </div>
  );
};

// Text Block Skeleton
export const TextBlockSkeleton: React.FC<{ lines?: number }> = ({ lines = 3 }) => {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          height="h-4"
          width={index === lines - 1 ? 'w-2/3' : 'w-full'}
        />
      ))}
    </div>
  );
};

// Loading Grid Skeleton
export const LoadingGridSkeleton: React.FC<{
  count?: number;
  Component: React.ComponentType;
}> = ({ count = 6, Component }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, index) => (
        <Component key={index} />
      ))}
    </div>
  );
};

// Page Skeleton (for full page loading)
export const PageSkeleton: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="mb-8">
        <Skeleton height="h-8" width="w-1/3" className="mb-4" />
        <Skeleton height="h-4" width="w-1/2" />
      </div>

      {/* Search Bar */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <Skeleton height="h-12" className="mb-4" />
        <div className="flex gap-4">
          <Skeleton height="h-10" width="w-32" />
          <Skeleton height="h-10" width="w-32" />
          <Skeleton height="h-10" width="w-32" />
        </div>
      </div>

      {/* Content Grid */}
      <LoadingGridSkeleton Component={ProductCardSkeleton} />
    </div>
  );
};
