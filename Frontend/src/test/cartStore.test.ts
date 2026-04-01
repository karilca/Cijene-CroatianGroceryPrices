import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../api/cart', () => {
  return {
    getCartItems: vi.fn(),
    addToCart: vi.fn(),
    incrementCartItem: vi.fn(),
    decrementCartItem: vi.fn(),
    removeFromCart: vi.fn(),
    optimizeCart: vi.fn(),
    submitCartOptimizationFeedback: vi.fn(),
  }
})

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
  },
}))

import { useCartStore } from '../stores/cartStore'
import * as cartApi from '../api/cart'

const getCartItemsMock = vi.mocked(cartApi.getCartItems)
const addToCartMock = vi.mocked(cartApi.addToCart)
const incrementCartItemMock = vi.mocked(cartApi.incrementCartItem)
const decrementCartItemMock = vi.mocked(cartApi.decrementCartItem)
const removeFromCartMock = vi.mocked(cartApi.removeFromCart)
const optimizeCartMock = vi.mocked(cartApi.optimizeCart)
const submitOptimizationFeedbackMock = vi.mocked(cartApi.submitCartOptimizationFeedback)

describe('useCartStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useCartStore.setState({
      items: [],
      isLoading: false,
      isInitialized: false,
      error: null,
      itemCount: 0,
      optimization: null,
      isOptimizing: false,
      optimizationError: null,
      isSubmittingOptimizationFeedback: false,
    })
  })

  it('loads cart items and calculates itemCount', async () => {
    getCartItemsMock.mockResolvedValue({
      items: [
        { id: 'A1', name: 'Product A1', product_id: 'A1', cart_quantity: 1 },
        { id: 'B2', name: 'Product B2', product_id: 'B2', cart_quantity: 3 },
      ],
    })

    await useCartStore.getState().loadCart()

    const state = useCartStore.getState()
    expect(state.items).toHaveLength(2)
    expect(state.itemCount).toBe(4)
    expect(state.isInitialized).toBe(true)
    expect(state.error).toBeNull()
  })

  it('stores error when loadCart fails', async () => {
    getCartItemsMock.mockRejectedValue(new Error('Backend unavailable'))

    await useCartStore.getState().loadCart()

    const state = useCartStore.getState()
    expect(state.error).toBe('Backend unavailable')
    expect(state.isInitialized).toBe(true)
    expect(state.isLoading).toBe(false)
  })

  it('addItem calls API and refreshes state', async () => {
    addToCartMock.mockResolvedValue({ success: true })
    getCartItemsMock.mockResolvedValue({
      items: [{ id: 'X1', name: 'Product X1', product_id: 'X1', cart_quantity: 2 }],
    })

    await useCartStore.getState().addItem('X1', 2)

    const state = useCartStore.getState()
    expect(addToCartMock).toHaveBeenCalledTimes(1)
    expect(getCartItemsMock).toHaveBeenCalledTimes(1)
    expect(state.itemCount).toBe(2)
  })

  it('removeItem calls API and refreshes state', async () => {
    removeFromCartMock.mockResolvedValue({ success: true, status: 'success' })
    getCartItemsMock.mockResolvedValue({
      items: [{ id: 'X1', name: 'Product X1', product_id: 'X1', cart_quantity: 1 }],
    })

    await useCartStore.getState().removeItem('X1')

    expect(removeFromCartMock).toHaveBeenCalledTimes(1)
    expect(getCartItemsMock).toHaveBeenCalledTimes(1)
  })

  it('incrementItem calls API and refreshes state', async () => {
    incrementCartItemMock.mockResolvedValue({ success: true })
    getCartItemsMock.mockResolvedValue({
      items: [{ id: 'X1', name: 'Product X1', product_id: 'X1', cart_quantity: 3 }],
    })

    await useCartStore.getState().incrementItem('X1')

    expect(incrementCartItemMock).toHaveBeenCalledTimes(1)
    expect(getCartItemsMock).toHaveBeenCalledTimes(1)
  })

  it('decrementItem calls API and refreshes state', async () => {
    decrementCartItemMock.mockResolvedValue({ success: true })
    getCartItemsMock.mockResolvedValue({
      items: [{ id: 'X1', name: 'Product X1', product_id: 'X1', cart_quantity: 1 }],
    })

    await useCartStore.getState().decrementItem('X1')

    expect(decrementCartItemMock).toHaveBeenCalledTimes(1)
    expect(getCartItemsMock).toHaveBeenCalledTimes(1)
  })

  it('optimizeCart stores optimization result', async () => {
    optimizeCartMock.mockResolvedValue({
      recommendation: {
        mode: 'balanced',
        totalCost: 12.5,
        currency: 'EUR',
        storesVisited: 1,
        averageDistanceKm: 2,
        score: 0.1,
        storeNames: ['KONZUM 1001'],
        stores: [],
        unavailableProducts: [],
      },
      alternatives: {},
      warnings: [],
      metadata: {
        algorithmUsed: 'exact_subset_enumeration',
        computationTimeMs: 5,
        storesConsidered: 2,
        storesAfterPruning: 2,
        candidatesEvaluated: 2,
        maxEnumerationStores: 20,
        hasUserLocation: true,
        partialFulfillment: false,
      },
    })

    await useCartStore.getState().optimizeCart({ mode: 'balanced' })

    const state = useCartStore.getState()
    expect(optimizeCartMock).toHaveBeenCalledTimes(1)
    expect(state.optimization?.recommendation.totalCost).toBe(12.5)
    expect(state.isOptimizing).toBe(false)
  })

  it('addItem throws if API returns failure', async () => {
    addToCartMock.mockResolvedValue({ success: false, message: 'Cannot add item' })

    await expect(useCartStore.getState().addItem('X1', 1)).rejects.toThrow('Cannot add item')
  })

  it('submitOptimizationFeedback posts recommendation feedback', async () => {
    optimizeCartMock.mockResolvedValue({
      recommendation: {
        mode: 'balanced',
        totalCost: 17.5,
        currency: 'EUR',
        storesVisited: 2,
        averageDistanceKm: 3.2,
        score: 0.2,
        storeNames: ['KONZUM 1001', 'LIDL 201'],
        stores: [],
        unavailableProducts: [],
      },
      alternatives: {},
      warnings: [],
      metadata: {
        algorithmUsed: 'heuristic_ranked_subset_search',
        computationTimeMs: 15,
        storesConsidered: 24,
        storesAfterPruning: 22,
        candidatesEvaluated: 120,
        maxEnumerationStores: 20,
        hasUserLocation: true,
        partialFulfillment: false,
      },
    })
    submitOptimizationFeedbackMock.mockResolvedValue({
      status: 'success',
      mode: 'balanced',
      accepted: true,
      tuning: {
        enabled: true,
        lookbackDays: 30,
        minFeedbackSamples: 20,
        acceptanceThreshold: 0.25,
        appliedDelta: 0,
      },
    })

    await useCartStore.getState().optimizeCart({ mode: 'balanced' })
    await useCartStore.getState().submitOptimizationFeedback(true)

    expect(submitOptimizationFeedbackMock).toHaveBeenCalledTimes(1)
    expect(submitOptimizationFeedbackMock).toHaveBeenCalledWith(expect.anything(), {
      mode: 'balanced',
      accepted: true,
      algorithmUsed: 'heuristic_ranked_subset_search',
      recommendationTotalCost: 17.5,
      recommendationStoresVisited: 2,
      recommendationAverageDistanceKm: 3.2,
    })
    expect(useCartStore.getState().isSubmittingOptimizationFeedback).toBe(false)
  })
})
