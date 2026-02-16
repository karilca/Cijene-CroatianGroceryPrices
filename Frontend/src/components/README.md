# Dokumentacija komponenti

Sve UI komponente za Cijene frontend aplikaciju, organizirane po funkcionalnosti.

## Struktura direktorija

**`/auth`** - Autentifikacija
- `AuthManager.tsx` - upravljanje stanjem autentifikacije
- `AuthModal.tsx` - modal za prijavu/registraciju
- `LoginForm.tsx` - forma za prijavu
- `RegisterForm.tsx` - forma za registraciju
- `ProtectedRoute.tsx` - zaštita ruta za prijavljene korisnike

**`/ui`** - Osnovne UI komponente
- `Button.tsx` - gumb s varijantama
- `Card.tsx` - kartica
- `Breadcrumb.tsx` - navigacijski breadcrumb

**`/common`** - Zajedničke komponente
- `BaseCard.tsx` - bazna kartica
- `BaseSearchComponent.tsx` - bazna komponenta za pretraživanje
- `ErrorBoundary.tsx` - hvatanje grešaka u komponentama
- `ErrorMessage.tsx` - prikaz poruka o greškama
- `ProgressIndicator.tsx` - indikator učitavanja
- `SkeletonLoader.tsx` - skeleton placeholder

**`/layout`** - Layout komponente za strukturu stranica

**`/product`** - Komponente za proizvode

**`/store`** - Komponente za trgovine

**`/chain`** - Komponente za trgovačke lance

**`/favorites`** - Upravljanje favoritima
- `FavoritesList.tsx` - prikaz i upravljanje favoritima

## Dizajn uzorci

**Props sučelje:**
```typescript
interface ComponentProps {
  children?: React.ReactNode;
  className?: string;
  // specifični propsi
}
```

**Stiliziranje:** TailwindCSS za utility-first pristup, CSS Modules za specifične stilove.

**Error handling:**
```typescript
<ErrorBoundary fallback={<ErrorMessage />}>
  <YourComponent />
</ErrorBoundary>
```

## Testiranje

Komponente se testiraju s React Testing Library i Vitest:

```typescript
import { render, screen } from '@testing-library/react'
import { YourComponent } from './YourComponent'

describe('YourComponent', () => {
  it('renderira ispravno', () => {
    render(<YourComponent />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })
})
```

## Mobilna responzivnost

Sve komponente koriste mobile-first pristup:
- Responsive breakpoints (Tailwind klase)
- Touch-friendly interakcije
- Optimizirano za male ekrane

## Pristupačnost

Komponente slijede WCAG smjernice:
- ARIA labele i uloge
- Podrška za tipkovnicu
- Kompatibilnost s čitačima ekrana
- Kontrast boja

## State management

- **Lokalni state** - za podatke specifične za komponentu
- **Zustand** - za globalni state aplikacije
- **React Query** - za server state

## Primjeri korištenja

```typescript
// Button
import { Button } from '@/components/ui/Button'
<Button variant="primary" onClick={handleClick}>Klikni</Button>

// Card
import { Card } from '@/components/ui/Card'
<Card className="p-4">
  <h2>Naslov</h2>
  <p>Sadržaj</p>
</Card>

// Error Boundary
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
<ErrorBoundary>
  <YourComponent />
</ErrorBoundary>
```

## Kreiranje novih komponenti

1. Smjesti u odgovarajući direktorij
2. Koristi PascalCase za imenovanje
3. Definiraj TypeScript sučelja
4. Dodaj u `index.ts` za barrel export
5. Napiši testove

**Checklist:**
- [ ] TypeScript sučelja definirana
- [ ] Responzivan dizajn implementiran
- [ ] Pristupačnost osigurana
- [ ] Error handling dodan
- [ ] Testovi napisani

## Performanse

- **Lazy Loading** - `React.lazy()` za velike komponente
- **Memoizacija** - `React.memo` za skupe renderiranja
- **Code Splitting** - organizacija za optimalni bundling
