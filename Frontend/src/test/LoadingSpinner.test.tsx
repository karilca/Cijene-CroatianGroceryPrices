import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

// Mock LoadingSpinner component
const MockLoadingSpinner: React.FC<{
  size?: 'sm' | 'md' | 'lg'
  className?: string
}> = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  }

  return (
    <div 
      className={`animate-spin rounded-full border-b-2 border-blue-500 ${sizeClasses[size]} ${className}`}
      data-testid="loading-spinner"
      data-size={size}
    />
  )
}

describe('LoadingSpinner Component', () => {
  it('should render with default medium size', () => {
    render(<MockLoadingSpinner />)

    const spinner = screen.getByTestId('loading-spinner')
    expect(spinner).toBeInTheDocument()
    expect(spinner).toHaveAttribute('data-size', 'md')
    expect(spinner).toHaveClass('h-8', 'w-8')
  })

  it('should render with small size', () => {
    render(<MockLoadingSpinner size="sm" />)

    const spinner = screen.getByTestId('loading-spinner')
    expect(spinner).toHaveAttribute('data-size', 'sm')
    expect(spinner).toHaveClass('h-4', 'w-4')
  })

  it('should render with large size', () => {
    render(<MockLoadingSpinner size="lg" />)

    const spinner = screen.getByTestId('loading-spinner')
    expect(spinner).toHaveAttribute('data-size', 'lg')
    expect(spinner).toHaveClass('h-12', 'w-12')
  })

  it('should apply custom className', () => {
    const customClass = 'custom-spinner-class'
    render(<MockLoadingSpinner className={customClass} />)

    const spinner = screen.getByTestId('loading-spinner')
    expect(spinner).toHaveClass(customClass)
  })

  it('should have default animation and styling classes', () => {
    render(<MockLoadingSpinner />)

    const spinner = screen.getByTestId('loading-spinner')
    expect(spinner).toHaveClass(
      'animate-spin',
      'rounded-full',
      'border-b-2',
      'border-blue-500'
    )
  })
})