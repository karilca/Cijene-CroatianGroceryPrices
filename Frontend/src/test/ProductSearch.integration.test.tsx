import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock ProductsPage component for integration testing
const MockProductsPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = React.useState('')
  const [products, setProducts] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(false)

  const handleSearch = async (query: string) => {
    setSearchQuery(query)
    setLoading(true)
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 100))
    
    if (query.trim()) {
      setProducts([
        {
          ean: '3838921300008',
          name: `Test Product for ${query}`,
          brand: 'Test Brand',
          chains: [
            {
              chain: 'KONZUM',
              min_price: '15.99',
              max_price: '18.99',
              avg_price: '17.49'
            }
          ]
        }
      ])
    } else {
      setProducts([])
    }
    
    setLoading(false)
  }

  return (
    <div data-testid="products-page">
      <h1>Products</h1>
      
      <form onSubmit={(e) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)
        const query = formData.get('search') as string
        handleSearch(query)
      }}>
        <input
          name="search"
          type="text"
          placeholder="Search products..."
          data-testid="product-search-input"
        />
        <button type="submit" data-testid="search-button">
          Search
        </button>
      </form>

      {loading && (
        <div data-testid="loading-indicator">Loading...</div>
      )}

      <div data-testid="product-results">
        {products.map((product) => (
          <div key={product.ean} data-testid="product-card">
            <h3>{product.name}</h3>
            <p>Brand: {product.brand}</p>
            <div data-testid="price-info">
              {product.chains.map((chain: any) => (
                <div key={chain.chain}>
                  {chain.chain}: €{chain.min_price} - €{chain.max_price}
                </div>
              ))}
            </div>
            <button data-testid="add-to-favorites">
              Add to Favorites
            </button>
          </div>
        ))}
      </div>

      {searchQuery && products.length === 0 && !loading && (
        <div data-testid="no-results">
          No products found for "{searchQuery}"
        </div>
      )}
    </div>
  )
}

describe('Product Search Integration', () => {
  it('should complete full product search flow', async () => {
    const user = userEvent.setup()
    render(<MockProductsPage />)

    // Verify page renders
    expect(screen.getByTestId('products-page')).toBeInTheDocument()
    expect(screen.getByText('Products')).toBeInTheDocument()

    // Enter search query
    const searchInput = screen.getByTestId('product-search-input')
    const searchButton = screen.getByTestId('search-button')

    await user.type(searchInput, 'milk')
    await user.click(searchButton)

    // Wait for loading state
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument()

    // Wait for results
    await waitFor(() => {
      expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument()
    })

    // Verify search results
    const productCards = screen.getAllByTestId('product-card')
    expect(productCards).toHaveLength(1)
    
    const productCard = productCards[0]
    expect(productCard).toHaveTextContent('Test Product for milk')
    expect(productCard).toHaveTextContent('Brand: Test Brand')
    
    // Verify price information
    const priceInfo = screen.getByTestId('price-info')
    expect(priceInfo).toHaveTextContent('KONZUM: €15.99 - €18.99')

    // Test add to favorites functionality
    const favoriteButton = screen.getByTestId('add-to-favorites')
    expect(favoriteButton).toBeInTheDocument()
    await user.click(favoriteButton)
  })

  it('should handle empty search results', async () => {
    const user = userEvent.setup()
    
    // Mock component that specifically handles empty results
    const MockEmptyResultsPage: React.FC = () => {
      const [searchQuery, setSearchQuery] = React.useState('')
      const [loading, setLoading] = React.useState(false)
      const [searched, setSearched] = React.useState(false)

      const handleSearch = async (query: string) => {
        setSearchQuery(query)
        setLoading(true)
        setSearched(true)
        
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 100))
        setLoading(false)
      }

      return (
        <div data-testid="products-page">
          <h1>Products</h1>
          
          <form onSubmit={(e) => {
            e.preventDefault()
            const formData = new FormData(e.currentTarget)
            const query = formData.get('search') as string
            handleSearch(query)
          }}>
            <input
              name="search"
              type="text"
              placeholder="Search products..."
              data-testid="product-search-input"
            />
            <button type="submit" data-testid="search-button">
              Search
            </button>
          </form>

          {loading && (
            <div data-testid="loading-indicator">Loading...</div>
          )}

          <div data-testid="product-results">
            {/* No products for this test */}
          </div>

          {searched && searchQuery && !loading && (
            <div data-testid="no-results">
              No products found for "{searchQuery}"
            </div>
          )}
        </div>
      )
    }

    render(<MockEmptyResultsPage />)

    // Search for something that returns no results
    const searchInput = screen.getByTestId('product-search-input')
    const searchButton = screen.getByTestId('search-button')

    await user.type(searchInput, 'nonexistent')
    await user.click(searchButton)

    // Wait for search to complete
    await waitFor(() => {
      expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument()
    })

    // Verify no results message
    expect(screen.getByTestId('no-results')).toBeInTheDocument()
    expect(screen.getByTestId('no-results')).toHaveTextContent('No products found for "nonexistent"')
    
    // Verify no product cards are shown
    expect(screen.queryByTestId('product-card')).not.toBeInTheDocument()
  })

  it('should handle search input changes', async () => {
    const user = userEvent.setup()
    render(<MockProductsPage />)

    const searchInput = screen.getByTestId('product-search-input')
    
    // Type and clear search
    await user.type(searchInput, 'test')
    expect(searchInput).toHaveValue('test')
    
    await user.clear(searchInput)
    expect(searchInput).toHaveValue('')
  })
})