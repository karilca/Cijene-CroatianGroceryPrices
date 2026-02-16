# Vodič za testiranje

Testing suite za Cijene frontend aplikaciju - unit, integration, e2e i performance testovi.

## Testing stack

- **Vitest** - brzi test runner
- **React Testing Library** - testiranje komponenti
- **MSW (Mock Service Worker)** - mockanje API-ja
- **jsdom** - DOM okruženje za testove

## Struktura testova

**Unit testovi:**
- `basic.test.ts` - utility funkcije
- `SearchInput.test.tsx` - search input komponenta
- `LoadingSpinner.test.tsx` - loading spinner

**Integration testovi:**
- `ProductSearch.integration.test.tsx` - pretraživanje proizvoda

**E2E testovi:**
- `e2e.test.ts` - kompletni user journeys

**Performance testovi:**
- `performance.test.ts` - bundle veličina i performanse

## Pokretanje testova

```bash
npm run test              # Svi testovi
npm run test:ui           # S UI sučeljem
npm run test:coverage     # S coverage izvještajem
npm run test -- --watch   # Watch mode
npm run test SearchInput.test.tsx  # Specifični test
npm run test -- --grep "search"    # Po patternu
```

## Setup konfiguracija

**setup.ts** - globalna konfiguracija:
```typescript
import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeAll, afterAll } from 'vitest'
import { setupServer } from 'msw/node'
import { handlers } from './mocks/handlers'

export const server = setupServer(...handlers)

beforeAll(() => server.listen())
afterEach(() => {
  server.resetHandlers()
  cleanup()
})
afterAll(() => server.close())
```

## Test utilities

**utils.tsx** - renderiranje s providerima:
```typescript
import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'

export function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{ui}</BrowserRouter>
    </QueryClientProvider>
  )
}
```

## Primjeri testova

**Unit test:**
```typescript
describe('SearchInput', () => {
  it('poziva onSearch kad se forma submita', async () => {
    const handleSearch = vi.fn()
    render(<SearchInput onSearch={handleSearch} />)
    
    await user.type(screen.getByRole('textbox'), 'test')
    await user.click(screen.getByRole('button'))
    
    expect(handleSearch).toHaveBeenCalledWith('test')
  })
})
```

**Integration test:**
```typescript
describe('Product Search', () => {
  it('prikazuje rezultate pretrage', async () => {
    renderWithProviders(<ProductSearchPage />)
    
    await user.type(screen.getByRole('textbox'), 'kruh')
    
    await waitFor(() => {
      expect(screen.getByText('Kruh bijeli')).toBeInTheDocument()
    })
  })
})
```

**E2E test:**
```typescript
describe('E2E', () => {
  it('pretraži proizvod i dodaj u favorite', async () => {
    renderWithProviders(<App />)
    
    await user.click(screen.getByText('Search'))
    await user.type(screen.getByRole('textbox'), 'kruh')
    
    await waitFor(() => {
      user.click(screen.getByLabelText('Add to favorites'))
    })
    
    await user.click(screen.getByText('Favorites'))
    expect(screen.getByText('Kruh bijeli')).toBeInTheDocument()
  })
})
```

## Mockanje

**API mockanje (MSW):**
```typescript
export const handlers = [
  http.get('/api/products/search', ({ request }) => {
    const url = new URL(request.url)
    const query = url.searchParams.get('q')
    return HttpResponse.json({
      products: mockProducts.filter(p => 
        p.name.toLowerCase().includes(query || '')
      )
    })
  }),
]
```

**Browser API mockanje:**
```typescript
const mockGeolocation = {
  getCurrentPosition: vi.fn((success) => {
    success({ coords: { latitude: 45.8150, longitude: 15.9819 } })
  }),
}
Object.defineProperty(navigator, 'geolocation', { value: mockGeolocation })
```

## Coverage ciljevi

- Statements: >80%
- Branches: >75%
- Functions: >80%
- Lines: >80%

## Debugging

```bash
# Verbose output
npm run test SearchInput.test.tsx -- --reporter=verbose
```

**U testu:**
```typescript
screen.debug()  // Ispis DOM-a
console.log(screen.getByRole('button'))  // Inspekcija elementa
```

## Najbolje prakse

**Radi:**
- Testiraj ponašanje, ne implementaciju
- Koristi semantičke querije (getByRole, getByLabelText)
- Mockaj eksterne ovisnosti
- Testiraj error stanja i rubne slučajeve

**Izbjegavaj:**
- Testiranje internog stanja komponente
- Implementation details u querijima
- Testove koji ovise jedni o drugima
- Mockanje svega

## Imenovanje datoteka

- Unit: `ComponentName.test.tsx`
- Integration: `FeatureName.integration.test.tsx`
- E2E: `e2e.test.ts`
- Performance: `performance.test.ts`

## Accessibility testiranje

```typescript
import { axe, toHaveNoViolations } from 'jest-axe'

expect.extend(toHaveNoViolations)

it('nema accessibility problema', async () => {
  const { container } = render(<YourComponent />)
  const results = await axe(container)
  expect(results).toHaveNoViolations()
})
```
