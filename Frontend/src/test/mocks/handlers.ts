import { http, HttpResponse } from 'msw'

const API_BASE_URL = 'http://127.0.0.1:8000'

export const handlers = [
  // Auth endpoints
  http.post(`${API_BASE_URL}/auth/login`, () => {
    return HttpResponse.json({
      token: 'mock-auth-token',
      refresh_token: 'mock-refresh-token',
      user: {
        id: '1',
        email: 'test@example.com',
        name: 'Test User'
      }
    })
  }),

  http.post(`${API_BASE_URL}/auth/register`, () => {
    return HttpResponse.json({
      token: 'mock-auth-token',
      refresh_token: 'mock-refresh-token',
      user: {
        id: '1',
        email: 'test@example.com',
        name: 'Test User'
      }
    })
  }),

  // Product endpoints (both v0 and v1)
  http.get(`${API_BASE_URL}/v0/products`, ({ request }) => {
    const url = new URL(request.url)
    const query = url.searchParams.get('query')
    
    return HttpResponse.json({
      products: [
        {
          ean: '3838921300008',
          brand: 'Test Brand',
          name: `Test Product for ${query}`,
          quantity: '500g',
          unit: 'g',
          chains: [
            {
              chain: 'KONZUM',
              code: 'KON123',
              name: 'Test Product Konzum',
              brand: 'Test Brand',
              category: 'Food',
              unit: 'g',
              quantity: '500g',
              min_price: '15.99',
              max_price: '18.99',
              avg_price: '17.49',
              price_date: '2024-01-15'
            }
          ]
        }
      ]
    })
  }),

  http.get(`${API_BASE_URL}/v1/products/`, ({ request }) => {
    const url = new URL(request.url)
    const query = url.searchParams.get('q')
    
    return HttpResponse.json({
      products: [
        {
          ean: '3838921300008',
          brand: 'Test Brand',
          name: `Test Product for ${query}`,
          quantity: '500g',
          unit: 'g',
          chains: [
            {
              chain: 'KONZUM',
              code: 'KON123',
              name: 'Test Product Konzum',
              brand: 'Test Brand',
              category: 'Food',
              unit: 'g',
              quantity: '500g',
              min_price: '15.99',
              max_price: '18.99',
              avg_price: '17.49',
              price_date: '2024-01-15'
            }
          ]
        }
      ]
    })
  }),

  http.get(`${API_BASE_URL}/v1/products/:ean/`, ({ params }) => {
    return HttpResponse.json({
      ean: params.ean,
      brand: 'Test Brand',
      name: 'Test Product',
      quantity: '500g',
      unit: 'g',
      chains: [
        {
          chain: 'KONZUM',
          code: 'KON123',
          name: 'Test Product Konzum',
          brand: 'Test Brand',
          category: 'Food',
          unit: 'g',
          quantity: '500g',
          min_price: '15.99',
          max_price: '18.99',
          avg_price: '17.49',
          price_date: '2024-01-15'
        }
      ]
    })
  }),

  // Store endpoints (both v0 and v1)
  http.get(`${API_BASE_URL}/v0/stores`, () => {
    return HttpResponse.json({
      stores: [
        {
          chain_code: 'KONZUM',
          code: 'KON001',
          type: 'supermarket',
          address: 'Test Address 1',
          city: 'Zagreb',
          zipcode: '10000',
          lat: 45.8150,
          lon: 15.9819,
          phone: '+385 1 1234567'
        },
        {
          chain_code: 'SPAR',
          code: 'SPAR001',
          type: 'hypermarket',
          address: 'Test Address 2',
          city: 'Zagreb',
          zipcode: '10000',
          lat: 45.8050,
          lon: 15.9719,
          phone: '+385 1 2345678'
        }
      ]
    })
  }),

  http.get(`${API_BASE_URL}/v1/stores/`, () => {
    return HttpResponse.json({
      stores: [
        {
          chain_code: 'KONZUM',
          code: 'KON001',
          type: 'supermarket',
          address: 'Test Address 1',
          city: 'Zagreb',
          zipcode: '10000',
          lat: 45.8150,
          lon: 15.9819,
          phone: '+385 1 1234567'
        },
        {
          chain_code: 'SPAR',
          code: 'SPAR001',
          type: 'hypermarket',
          address: 'Test Address 2',
          city: 'Zagreb',
          zipcode: '10000',
          lat: 45.8050,
          lon: 15.9719,
          phone: '+385 1 2345678'
        }
      ]
    })
  }),

  // Chain endpoints
  http.get(`${API_BASE_URL}/v1/chains/`, () => {
    return HttpResponse.json({
      chains: ['KONZUM', 'SPAR', 'PLODINE', 'TOMMY', 'INTERSPAR']
    })
  }),

  http.get(`${API_BASE_URL}/v1/:chainCode/stores/`, ({ params }) => {
    return HttpResponse.json({
      stores: [
        {
          chain_code: params.chainCode,
          code: `${params.chainCode}001`,
          type: 'supermarket',
          address: `Test Address for ${params.chainCode}`,
          city: 'Zagreb',
          zipcode: '10000',
          lat: 45.8150,
          lon: 15.9819,
          phone: '+385 1 1234567'
        }
      ]
    })
  }),

  // Archives endpoint
  http.get(`${API_BASE_URL}/v0/list`, () => {
    return HttpResponse.json({
      archives: [
        {
          date: '2024-01-15',
          url: 'https://cijene.searxngmate.tk/v0/archive/2024-01-15.zip',
          size: 1234567,
          updated: '2024-01-15T10:00:00+00:00'
        },
        {
          date: '2024-01-14',
          url: 'https://cijene.searxngmate.tk/v0/archive/2024-01-14.zip',
          size: 1200000,
          updated: '2024-01-14T10:00:00+00:00'
        }
      ]
    })
  }),

  // Prices endpoint
  http.get(`${API_BASE_URL}/v1/prices/`, () => {
    return HttpResponse.json({
      store_prices: [
        {
          chain: 'KONZUM',
          ean: '3838921300008',
          price_date: '2024-01-15',
          regular_price: '17.99',
          special_price: '15.99',
          unit_price: '31.98',
          best_price_30: '15.99',
          anchor_price: '17.99',
          store: {
            chain_id: 1,
            code: 'KON001',
            type: 'supermarket',
            address: 'Test Address 1',
            city: 'Zagreb',
            zipcode: '10000',
            lat: 45.8150,
            lon: 15.9819,
            phone: '+385 1 1234567'
          }
        }
      ]
    })
  }),

  // Chain stats endpoint
  http.get(`${API_BASE_URL}/v1/chain-stats/`, () => {
    return HttpResponse.json({
      chain_stats: [
        {
          chain_code: 'KONZUM',
          price_date: '2024-01-15',
          price_count: 15000,
          store_count: 150,
          created_at: '2024-01-15T10:00:00+00:00'
        },
        {
          chain_code: 'SPAR',
          price_date: '2024-01-15',
          price_count: 12000,
          store_count: 80,
          created_at: '2024-01-15T10:00:00+00:00'
        }
      ]
    })
  }),

  // Health check
  http.get(`${API_BASE_URL}/health`, () => {
    return HttpResponse.json({ status: 'ok' })
  })
]