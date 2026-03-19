import { SupabaseClient } from '@supabase/supabase-js';
import { apiUrl } from '../config/api';
import type { Product } from '../types';

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

/**
 * Add a product to the cart.
 */
export const addToCart = async (
    supabase: SupabaseClient, 
    productId: string,
    quantity: number = 1
): Promise<{ success: boolean; message?: string }> => {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return { success: false, message: 'User is not authenticated.' };

        const payload: CartItemRequest = {
            product_id: productId,
            quantity: quantity
        };

        const response = await fetch(apiUrl('/v1/cart/add'), {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${session.access_token}` 
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error('Failed to add cart item');

        return { success: true };
    } catch (error) {
        return { success: false, message: error instanceof Error ? error.message : 'Unknown cart error' };
    }
};

/**
 * Fetch all cart items.
 */
export const getCartItems = async (supabase: SupabaseClient): Promise<CartItemsPayload> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { items: [] };

    const response = await fetch(apiUrl('/v1/cart'), {
        method: "GET",
        headers: { "Authorization": `Bearer ${session.access_token}` }
    });

    if (!response.ok) throw new Error('Failed to load cart');
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
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('User is not authenticated');

        const response = await fetch(apiUrl(`/v1/cart/remove/${productId}`), {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${session.access_token}` }
        });

        if (!response.ok) throw new Error('Failed to remove cart item');

        return { status: 'success', success: true };
    } catch (error: unknown) {
        return { 
            status: 'error', 
            success: false, 
            message: error instanceof Error ? error.message : 'Failed to remove cart item' 
        };
    }
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