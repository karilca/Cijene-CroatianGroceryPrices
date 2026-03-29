import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../api/cart', () => {
  return {
    getCartItems: vi.fn(),
    addToCart: vi.fn(),
    removeFromCart: vi.fn(),
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
const removeFromCartMock = vi.mocked(cartApi.removeFromCart)

describe('useCartStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useCartStore.setState({
      items: [],
      isLoading: false,
      isInitialized: false,
      error: null,
      itemCount: 0,
    })
  })

  it('loads cart items and calculates itemCount', async () => {
    getCartItemsMock.mockResolvedValue({
      items: [
        { product_id: 'A1', quantity: 1 },
        { product_id: 'B2', cart_quantity: 3 },
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
      items: [{ product_id: 'X1', cart_quantity: 2 }],
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
      items: [{ product_id: 'X1', cart_quantity: 1 }],
    })

    await useCartStore.getState().removeItem('X1')

    expect(removeFromCartMock).toHaveBeenCalledTimes(1)
    expect(getCartItemsMock).toHaveBeenCalledTimes(1)
  })

  it('addItem throws if API returns failure', async () => {
    addToCartMock.mockResolvedValue({ success: false, message: 'Cannot add item' })

    await expect(useCartStore.getState().addItem('X1', 1)).rejects.toThrow('Cannot add item')
  })
})
