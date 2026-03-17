import { SupabaseClient } from '@supabase/supabase-js';
import { apiUrl } from '../config/api';
import type { Product } from '../types';

// Tipovi usklađeni s tvojim interfejsima i backendom
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
 * Dodaje proizvod u košaricu
 */
export const addToCart = async (
    supabase: SupabaseClient, 
    productId: string,
    quantity: number = 1
): Promise<{ success: boolean; message?: string }> => {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return { success: false, message: "Korisnik nije prijavljen." };

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

        if (!response.ok) throw new Error("Greška pri dodavanju");
        
        window.dispatchEvent(new Event('cart-updated'));
        return { success: true };
    } catch (error) {
        return { success: false, message: error instanceof Error ? error.message : "Greška" };
    }
};

/**
 * Dohvaća sve stavke
 */
export const getCartItems = async (supabase: SupabaseClient): Promise<CartItemsPayload> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { items: [] };

    const response = await fetch(apiUrl('/v1/cart'), {
        method: "GET",
        headers: { "Authorization": `Bearer ${session.access_token}` }
    });

    if (!response.ok) throw new Error("Greška pri dohvaćanju");
    return await response.json() as CartItemsPayload;
};

/**
 * Briše proizvod i rješava TS error 'status is missing'
 */
export const removeFromCart = async (
    supabase: SupabaseClient, 
    productId: string
): Promise<CartResponse> => {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Niste prijavljeni");

        const response = await fetch(apiUrl(`/v1/cart/remove/${productId}`), {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${session.access_token}` }
        });

        if (!response.ok) throw new Error("Greška pri brisanju");

        window.dispatchEvent(new Event('cart-updated'));
        
        // Vraćamo oba polja da zadovoljimo sve provjere u kodu
        return { status: "success", success: true };
    } catch (error: unknown) {
        return { 
            status: "error", 
            success: false, 
            message: error instanceof Error ? error.message : "Neuspješno brisanje" 
        };
    }
};

/**
 * Broji stavke za Navigation.tsx
 */
export const getCartCount = async (supabase: SupabaseClient): Promise<number> => {
    try {
        const data = await getCartItems(supabase);
        return Array.isArray(data.items) ? data.items.length : 0;
    } catch {
        return 0;
    }
};