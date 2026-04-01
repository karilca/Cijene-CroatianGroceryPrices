import { SupabaseClient } from '@supabase/supabase-js';
import { apiUrl } from '../config/api';
import type {
    CartOptimizeFeedbackRequest,
    CartOptimizeFeedbackResponse,
    CartOptimizationResponse,
    CartOptimizeRequest,
    CartQuantityUpdateResponse,
    Product,
} from '../types';
import { createLocalizedApiErrorFromPayload, LocalizedApiError } from '../utils/apiErrors';

// Types aligned with frontend interfaces and backend responses
export interface CartItemRequest {
    product_id: string;
    quantity: number;
}

export interface CartResponse {
    status: string;
    success: boolean;
    message?: string;
}

export type CartItem = Product & {
    product_id?: string;
    quantity?: number;
    cart_quantity?: number;
};

export interface CartItemsPayload {
    items: CartItem[];
}

const getAccessToken = async (supabase: SupabaseClient): Promise<string> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        throw new LocalizedApiError('AUTH_REQUIRED', 'Authentication is required.');
    }
    return session.access_token;
};

/**
 * Add a product to the cart.
 */
export const addToCart = async (
    supabase: SupabaseClient, 
    productId: string,
    quantity: number = 1
): Promise<{ success: boolean; message?: string }> => {
    try {
        const accessToken = await getAccessToken(supabase);

        const payload: CartItemRequest = {
            product_id: productId,
            quantity: quantity
        };

        const response = await fetch(apiUrl('/v1/cart/add'), {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${accessToken}` 
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const payload = await response.json().catch(() => null);
            throw createLocalizedApiErrorFromPayload(payload, 'Failed to add item to cart.');
        }

        return { success: true };
    } catch (error) {
        return { success: false, message: error instanceof Error ? error.message : 'Failed to add item to cart.' };
    }
};

/**
 * Fetch all cart items.
 */
export const getCartItems = async (supabase: SupabaseClient): Promise<CartItemsPayload> => {
    const accessToken = await getAccessToken(supabase);

    const response = await fetch(apiUrl('/v1/cart'), {
        method: "GET",
        headers: { "Authorization": `Bearer ${accessToken}` }
    });

    if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw createLocalizedApiErrorFromPayload(payload, 'Failed to load cart.');
    }
    return await response.json() as CartItemsPayload;
};

/**
 * Remove a product from the cart.
 */
export const removeFromCart = async (
    supabase: SupabaseClient, 
    productId: string
): Promise<CartResponse> => {
    try {
        const accessToken = await getAccessToken(supabase);

        const response = await fetch(apiUrl(`/v1/cart/remove/${encodeURIComponent(productId)}`), {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${accessToken}` }
        });

        if (!response.ok) {
            const payload = await response.json().catch(() => null);
            throw createLocalizedApiErrorFromPayload(payload, 'Failed to remove item from cart.');
        }

        return { status: 'success', success: true };
    } catch (error: unknown) {
        return { 
            status: 'error', 
            success: false, 
            message: error instanceof Error ? error.message : 'Failed to remove item from cart.' 
        };
    }
};

const updateCartQuantity = async (
    supabase: SupabaseClient,
    endpoint: string,
    fallbackErrorMessage: string,
): Promise<{ success: boolean; message?: string; payload?: CartQuantityUpdateResponse }> => {
    try {
        const accessToken = await getAccessToken(supabase);
        const response = await fetch(apiUrl(endpoint), {
            method: 'POST',
            headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!response.ok) {
            const payload = await response.json().catch(() => null);
            throw createLocalizedApiErrorFromPayload(payload, fallbackErrorMessage);
        }

        const payload = (await response.json()) as CartQuantityUpdateResponse;
        return { success: true, payload };
    } catch (error: unknown) {
        return {
            success: false,
            message: error instanceof Error ? error.message : fallbackErrorMessage,
        };
    }
};

export const incrementCartItem = async (
    supabase: SupabaseClient,
    productId: string,
): Promise<{ success: boolean; message?: string; payload?: CartQuantityUpdateResponse }> => {
    return updateCartQuantity(
        supabase,
        `/v1/cart/increment/${encodeURIComponent(productId)}`,
        'Failed to increase cart quantity.',
    );
};

export const decrementCartItem = async (
    supabase: SupabaseClient,
    productId: string,
): Promise<{ success: boolean; message?: string; payload?: CartQuantityUpdateResponse }> => {
    return updateCartQuantity(
        supabase,
        `/v1/cart/decrement/${encodeURIComponent(productId)}`,
        'Failed to decrease cart quantity.',
    );
};

export const optimizeCart = async (
    supabase: SupabaseClient,
    request: CartOptimizeRequest,
): Promise<CartOptimizationResponse> => {
    const accessToken = await getAccessToken(supabase);
    const response = await fetch(apiUrl('/v1/cart/optimize'), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(request),
    });

    if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw createLocalizedApiErrorFromPayload(payload, 'Failed to optimize cart.');
    }

    return (await response.json()) as CartOptimizationResponse;
};

export const submitCartOptimizationFeedback = async (
    supabase: SupabaseClient,
    request: CartOptimizeFeedbackRequest,
): Promise<CartOptimizeFeedbackResponse> => {
    const accessToken = await getAccessToken(supabase);
    const response = await fetch(apiUrl('/v1/cart/optimize/feedback'), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(request),
    });

    if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw createLocalizedApiErrorFromPayload(payload, 'Failed to submit optimization feedback.');
    }

    return (await response.json()) as CartOptimizeFeedbackResponse;
};

/**
 * Count cart entries.
 */
export const getCartCount = async (supabase: SupabaseClient): Promise<number> => {
    try {
        const data = await getCartItems(supabase);
        return Array.isArray(data.items) ? data.items.length : 0;
    } catch {
        return 0;
    }
};