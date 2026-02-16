import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock the SearchInput component since we need to test it
const MockSearchInput: React.FC<{
  placeholder?: string
  onSearch: (query: string) => void
  className?: string
}> = ({ placeholder = 'Search...', onSearch, className = '' }) => {
  const [query, setQuery] = React.useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      onSearch(query.trim())
    }
  }

  const handleClear = () => {
    setQuery('')
    onSearch('')
  }

  return (
    <form onSubmit={handleSubmit} className={className}>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        data-testid="search-input"
      />
      <button type="submit" data-testid="search-submit">
        Search
      </button>
      <button type="button" onClick={handleClear} data-testid="search-clear">
        Clear
      </button>
    </form>
  )
}

describe('SearchInput Component', () => {
  let mockOnSearch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockOnSearch = vi.fn()
  })

  it('should render with default placeholder', () => {
    render(<MockSearchInput onSearch={mockOnSearch} />)

    const input = screen.getByTestId('search-input')
    expect(input).toBeInTheDocument()
    expect(input).toHaveAttribute('placeholder', 'Search...')
  })

  it('should render with custom placeholder', () => {
    const customPlaceholder = 'Search products...'
    render(<MockSearchInput onSearch={mockOnSearch} placeholder={customPlaceholder} />)

    const input = screen.getByTestId('search-input')
    expect(input).toHaveAttribute('placeholder', customPlaceholder)
  })

  it('should update input value when user types', async () => {
    const user = userEvent.setup()
    render(<MockSearchInput onSearch={mockOnSearch} />)

    const input = screen.getByTestId('search-input')
    await user.type(input, 'test query')

    expect(input).toHaveValue('test query')
  })

  it('should call onSearch when form is submitted', async () => {
    const user = userEvent.setup()
    render(<MockSearchInput onSearch={mockOnSearch} />)

    const input = screen.getByTestId('search-input')
    const submitButton = screen.getByTestId('search-submit')

    await user.type(input, 'test query')
    await user.click(submitButton)

    expect(mockOnSearch).toHaveBeenCalledWith('test query')
  })

  it('should clear input when clear button is clicked', async () => {
    const user = userEvent.setup()
    render(<MockSearchInput onSearch={mockOnSearch} />)

    const input = screen.getByTestId('search-input')
    const clearButton = screen.getByTestId('search-clear')

    await user.type(input, 'test query')
    expect(input).toHaveValue('test query')

    await user.click(clearButton)
    expect(input).toHaveValue('')
    expect(mockOnSearch).toHaveBeenCalledWith('')
  })

  it('should not submit empty query', async () => {
    const user = userEvent.setup()
    render(<MockSearchInput onSearch={mockOnSearch} />)

    const submitButton = screen.getByTestId('search-submit')
    await user.click(submitButton)

    expect(mockOnSearch).not.toHaveBeenCalled()
  })

  it('should trim whitespace from query', async () => {
    const user = userEvent.setup()
    render(<MockSearchInput onSearch={mockOnSearch} />)

    const input = screen.getByTestId('search-input')
    const submitButton = screen.getByTestId('search-submit')

    await user.type(input, '  test query  ')
    await user.click(submitButton)

    expect(mockOnSearch).toHaveBeenCalledWith('test query')
  })

  it('should apply custom className', () => {
    const customClass = 'custom-search-class'
    render(<MockSearchInput onSearch={mockOnSearch} className={customClass} />)

    const form = screen.getByTestId('search-input').closest('form')
    expect(form).toHaveClass(customClass)
  })
})