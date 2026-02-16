# Cijene Web UI

Moderna React aplikacija za usporedbu cijena namirnica u hrvatskim trgovačkim lancima. Optimizirana za mobilne uređaje, izgrađena s React 19, TypeScript i TailwindCSS.

## Značajke

- **Pretraživanje proizvoda** - usporedba cijena po lancima
- **Pronalazač trgovina** - trgovine u blizini s geolokacijom
- **Favoriti** - spremanje omiljenih proizvoda
- **Arhiva cijena** - pregled povijesnih podataka
- **Pregled po lancima** - pregledavanje proizvoda po trgovačkom lancu
- **Postavke** - prilagodba jezika i preferenci
- **Responzivan dizajn** - optimizirano za sve veličine ekrana

## Brzi početak

**Preduvjeti:** Node.js 18+ i npm

```bash
# Uđi u projekt
# Instaliraj ovisnosti
npm install

# Postavi environment varijable
cp .env.example .env.development

# Pokreni development server
npm run dev
```

Aplikacija će biti dostupna na `http://localhost:5173`

## NPM Skripte

```bash
npm run dev          # Development server
npm run build        # Produkcijski build
npm run preview      # Pregled produkcijskog builda
npm test             # Pokreni testove (40+ testova)
npm run test:ui      # Testovi s UI sučeljem
npm run test:coverage # Pokrivenost testovima
npm run lint         # ESLint provjera koda
```

Za mobilno testiranje: `npm run dev -- --host 0.0.0.0`

## Struktura projekta

```
cijene-frontend/
├── src/
│   ├── components/    # UI komponente (auth, chain, product, store, ui...)
│   ├── pages/         # Stranice (Home, Products, Stores, Favorites...)
│   ├── hooks/         # Custom React hooks
│   ├── services/      # API servisi
│   ├── stores/        # Zustand state management
│   ├── contexts/      # React konteksti (Auth, Language)
│   ├── utils/         # Pomoćne funkcije
│   ├── types/         # TypeScript tipovi
│   └── test/          # Testovi i mockovi
├── public/            # Statički resursi
└── dist/              # Produkcijski build
```

## Environment varijable

Obavezne varijable:
- `VITE_API_BASE_URL` - URL backend API-ja
- `VITE_API_TOKEN` - API token za autorizaciju

Opcionalne varijable:
- `VITE_API_FALLBACK_URL` - fallback URL ako glavni API nije dostupan
- `VITE_ENABLE_MOCK_DATA` - korištenje mock podataka (default: false)
- `VITE_ENABLE_OFFLINE_MODE` - offline način rada (default: false)
- `VITE_BETA_FEATURES` - prikaz beta funkcionalnosti (default: false)
- `VITE_ARCHIVES_PER_PAGE` - broj arhiva po stranici (default: 10)

## Deployment

**Vercel (preporučeno):**
```bash
npm install -g vercel
vercel --prod
```

**Netlify:**
```bash
npm run build
netlify deploy --prod --dir=dist
```

**Ručni deployment:**
```bash
npm run build
# Uploadaj dist/ folder na hosting
# Server mora posluživati index.html za sve rute (SPA)
```

## Testiranje

Aplikacija ima 40+ testova: unit, integration, e2e i performance testovi.

```bash
npm test                         # Svi testovi
npm test -- --watch              # Watch mode
npm test -- SearchInput.test.tsx # Specifični test
npm run test:coverage            # Coverage izvještaj
```

Korišteni alati: Vitest, React Testing Library, MSW

## Validacija prije deploya

```bash
./validate.sh
```

Skripta provjerava: ovisnosti, linting, testove, build, sigurnosnu reviziju i veličinu bundlea.

## Rješavanje problema

**Build ne prolazi:**
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

**Environment varijable ne rade:**
- Moraju započeti s `VITE_`
- Restartaj dev server nakon promjena

## Tehnologije

- React 19 + TypeScript
- Vite 7
- TailwindCSS
- React Router DOM 7
- Zustand + React Query
- Axios
- Vitest + React Testing Library + MSW
- ESLint + Prettier
- Lucide React (ikone)

## Dodatna dokumentacija

- [Dokumentacija komponenti](./cijene-frontend/src/components/README.md)
- [Vodič za testiranje](./cijene-frontend/src/test/README.md)
- [Vodič za deployment](./DEPLOYMENT.md)